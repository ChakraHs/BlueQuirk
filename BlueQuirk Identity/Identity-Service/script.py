import xml.etree.ElementTree as ET
from collections import defaultdict
import matplotlib.pyplot as plt
import sys

def parse_xml_file(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    error_counts = defaultdict(int)

    for error in root.findall('.//error'):
        error_type = error.get('source').split('.')[-1]
        error_counts[error_type] += 1

    return error_counts

def create_chart(error_counts):
    # Sort the error types by count in descending order
    sorted_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
    error_types, counts = zip(*sorted_errors)

    plt.figure(figsize=(15, 10))
    bars = plt.bar(error_types, counts)
    plt.title('Frequency of Error Types')
    plt.xlabel('Error Types')
    plt.ylabel('Number of Occurrences')
    plt.xticks(rotation=90)

    # Add value labels on top of each bar
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                 f'{height}',
                 ha='center', va='bottom')

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":

    xml_file_path = "target/checkstyle-result.xml"
    try:
        error_counts = parse_xml_file(xml_file_path)
        create_chart(error_counts)
    except FileNotFoundError:
        print(f"Error: File not found at {xml_file_path}")
    except ET.ParseError:
        print(f"Error: Unable to parse XML file at {xml_file_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")