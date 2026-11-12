import sys
import os
import datetime
import pandas as pd
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sha2, concat_ws
from pyspark.sql.types import StructType, StructField, StringType, IntegerType

def main():
    # Initialize optimized Spark Session
    spark = SparkSession.builder \
        .appName("ETL-Build-All-Dimension-Tables") \
        .getOrCreate()
    
    print("="*60)
    print("STARTING WAREHOUSE DIMENSION PRODUCTION PIPELINE")
    print("="*60)

    # ----------------------------------------------------
    # DIMENSION 1: MASTER GEOGRAPHY
    # ----------------------------------------------------
    print("\n[1/4] Writing Master Geography Dimension...")
    pkl_path = "data/processed/geography.pkl"
    if os.path.exists(pkl_path):
        pdf = pd.read_pickle(pkl_path)
        geo_raw_spark = spark.createDataFrame(pdf.astype(str))
        geo_dim_df = geo_raw_spark.select(
            col("Country").alias("country"),
            col("state").alias("state"),
            col("district").alias("district")
        ).distinct()
        geo_dim_df = geo_dim_df.withColumn(
            "geography_key", 
            sha2(concat_ws("||", col("country"), col("state"), col("district")), 256)
        )
        geo_dim_df.write.mode("overwrite").parquet("data/warehouse/dim_geography")
        print("-> Saved data/warehouse/dim_geography")
    else:
        print(f"-> Warning: Missing file {pkl_path}.")

    # ----------------------------------------------------
    # DIMENSION 2: MASTER TIME/DATE
    # ----------------------------------------------------
    print("\n[2/4] Writing Master Date Dimension...")
    start_date = datetime.date(1997, 1, 1)
    today_date = datetime.date.today()
    total_days = (today_date - start_date).days + 1 
    
    date_df = spark.range(0, total_days).selectExpr(
        "date_add(date('1997-01-01'), int(id)) as raw_date"
    )
    date_dim_df = date_df.selectExpr(
        "raw_date as date_key",                                      
        "date_format(raw_date, 'dd-MM-yyyy') as display_date",        
        "year(raw_date) as year",
        "month(raw_date) as month",
        "date_format(raw_date, 'MMMM') as month_name",
        "dayofmonth(raw_date) as day",
        "dayofweek(raw_date) as day_of_week",
        "date_format(raw_date, 'EEEE') as day_name",
        "quarter(raw_date) as quarter",
        "case when dayofweek(raw_date) in (1, 7) then 1 else 0 end as is_weekend"
    )
    date_dim_df.write.mode("overwrite").parquet("data/warehouse/dim_date")
    print("-> Saved data/warehouse/dim_date")

    # ----------------------------------------------------
    # DIMENSION 3: MASTER CROP DIMENSION
    # ----------------------------------------------------
    print("\n[3/4] Writing Master Crop Dimension...")
    # UPDATE THIS FILE TO PATH OF YOUR RAW STAGING PRODUCTION FILE (e.g., .csv or .parquet)
    raw_production_path = "data/staging/crop_production.parquet" 
    
    if os.path.exists(raw_production_path):
        raw_prod_df = spark.read.parquet(raw_production_path) 
        crop_dim_df = raw_prod_df.select(
            col("crop_name"),
            col("crop_code"),
            col("crop_type")
        ).distinct()
        crop_dim_df = crop_dim_df.withColumn(
            "crop_key",
            sha2(concat_ws("||", col("crop_name"), col("crop_code"), col("crop_type")), 256)
        )
        crop_dim_df.write.mode("overwrite").parquet("data/warehouse/dim_crop")
        print("-> Saved data/warehouse/dim_crop")
    else:
        print(f"-> Skip/Warning: Missing staging file at {raw_production_path}.")

    # ----------------------------------------------------
    # DIMENSION 4: SEASONS BRIDGE
    # ----------------------------------------------------
    print("\n[4/4] Writing Master Season Dimension...")
    season_schema = StructType([
        StructField("season_name", StringType(), False),
        StructField("start_month", IntegerType(), False),
        StructField("end_month", IntegerType(), False)
    ])
    season_data = [
        ("Kharif", 6, 10),
        ("Rabi", 11, 4),
        ("Summer", 5, 6),
        ("Autumn", 9, 11),
        ("Winter", 12, 2),
        ("Whole Year", 1, 12),
        ("Total", 1, 12)
    ]
    season_raw_df = spark.createDataFrame(season_data, schema=season_schema)
    dim_season_df = season_raw_df.withColumn("season_key", sha2(col("season_name"), 256))
    dim_season_df.write.mode("overwrite").parquet("data/warehouse/dim_season")
    print("-> Saved data/warehouse/dim_season")

    print("\n" + "="*60)
    print("SUCCESS: ALL STORAGE LAYERS COMPLETED!")
    print("="*60)
    spark.stop()

if __name__ == "__main__":
    main()
