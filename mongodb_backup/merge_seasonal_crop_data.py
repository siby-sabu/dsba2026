#!/usr/bin/env python3
"""
Merge split seasonal_crop_data BSON files back into a single file.

This script combines seasonal_crop_data_part1.bson and seasonal_crop_data_part2.bson
back into the original seasonal_crop_data.bson file.

Usage:
    python3 mongodb_backup/merge_seasonal_crop_data.py
"""

import bson
import os
import sys

def merge_bson_files():
    """Merge split BSON files into a single file."""

    base_dir = 'mongodb_backup/agri_analytics'
    part1_file = os.path.join(base_dir, 'seasonal_crop_data_part1.bson')
    part2_file = os.path.join(base_dir, 'seasonal_crop_data_part2.bson')
    output_file = os.path.join(base_dir, 'seasonal_crop_data.bson')

    # Check if split files exist
    if not os.path.exists(part1_file):
        print(f"Error: {part1_file} not found")
        sys.exit(1)

    if not os.path.exists(part2_file):
        print(f"Error: {part2_file} not found")
        sys.exit(1)

    print("Reading part 1...")
    with open(part1_file, 'rb') as f:
        part1_data = f.read()

    part1_docs = []
    offset = 0
    while offset < len(part1_data):
        doc_size = int.from_bytes(part1_data[offset:offset+4], byteorder='little')
        doc_bytes = part1_data[offset:offset+doc_size]
        part1_docs.append(bson.decode(doc_bytes))
        offset += doc_size

    print(f"  Loaded {len(part1_docs)} documents from part 1")

    print("Reading part 2...")
    with open(part2_file, 'rb') as f:
        part2_data = f.read()

    part2_docs = []
    offset = 0
    while offset < len(part2_data):
        doc_size = int.from_bytes(part2_data[offset:offset+4], byteorder='little')
        doc_bytes = part2_data[offset:offset+doc_size]
        part2_docs.append(bson.decode(doc_bytes))
        offset += doc_size

    print(f"  Loaded {len(part2_docs)} documents from part 2")

    # Merge documents (interleave to restore original order)
    print("\nMerging documents...")
    merged_docs = []
    for i in range(max(len(part1_docs), len(part2_docs))):
        if i < len(part1_docs):
            merged_docs.append(part1_docs[i])
        if i < len(part2_docs):
            merged_docs.append(part2_docs[i])

    print(f"  Total merged documents: {len(merged_docs)}")

    # Write merged file
    print(f"\nWriting merged file to {output_file}...")
    with open(output_file, 'wb') as f:
        for doc in merged_docs:
            f.write(bson.encode(doc))

    output_size = os.path.getsize(output_file) / (1024 * 1024)
    print(f"  Output file size: {output_size:.2f} MB")

    print("\n✓ Merge complete!")
    print(f"  Original file restored: {output_file}")
    print(f"  Total documents: {len(merged_docs)}")

    # Copy metadata file if it exists for part1
    metadata_part1 = os.path.join(base_dir, 'seasonal_crop_data_part1.metadata.json')
    metadata_output = os.path.join(base_dir, 'seasonal_crop_data.metadata.json')

    if os.path.exists(metadata_part1) and not os.path.exists(metadata_output):
        import shutil
        shutil.copy(metadata_part1, metadata_output)
        print(f"  Metadata file copied: {metadata_output}")

if __name__ == '__main__':
    try:
        merge_bson_files()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
