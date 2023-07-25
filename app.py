from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
import random
import pandas as pd

app = Flask(__name__)
CORS(app)

# Configure MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['student_performance']
students_collection = db['students']
excel_collection = db['excel_data']


@app.route('/students', methods=['GET'])
def get_students():
    students = list(students_collection.find())
    # Convert ObjectId to string for JSON serialization
    for student in students:
        student['_id'] = str(student['_id'])
    return jsonify(students), 200


@app.route('/students', methods=['POST'])
def add_student():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Invalid request'}), 400

    name = data.get('name')
    standard = data.get('standard')
    marks = data.get('marks')

    if not (name and standard and marks):
        return jsonify({'message': 'Incomplete data'}), 400

    student = {
        'name': name,
        'standard': standard,
        'marks': marks
    }

    result = students_collection.insert_one(student)

    if result.inserted_id:
        return jsonify({'message': 'Student added successfully'}), 201
    else:
        return jsonify({'message': 'Failed to add student'}), 500


@app.route('/students/<student_id>', methods=['PUT'])
def update_student(student_id):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Invalid request'}), 400

    name = data.get('name')
    standard = data.get('standard')
    marks = data.get('marks')

    if not (name and standard and marks):
        return jsonify({'message': 'Incomplete data'}), 400

    updated_student = {
        'name': name,
        'standard': standard,
        'marks': marks
    }

    result = students_collection.update_one({'_id': ObjectId(student_id)}, {'$set': updated_student})

    if result.modified_count > 0:
        return jsonify({'message': 'Student updated successfully'}), 200
    else:
        return jsonify({'message': 'Failed to update student'}), 404


@app.route('/chart-data', methods=['GET'])
def get_chart_data():
    students = list(students_collection.find())
    chart_data = {
        'labels': [student['name'] for student in students],
        'datasets': [
            {
                'data': [sum(student['marks']) for student in students],
                'backgroundColor': [get_random_color() for _ in students],
            },
        ],
    }
    return jsonify(chart_data), 200


@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    if not file:
        return jsonify({'message': 'No file uploaded'}), 400

    print(file)  # Debug: Check if the file is being received

    # Read the file and extract student data
    if file.filename.endswith('.csv'):
        df = pd.read_csv(file)
    elif file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
        df = pd.read_excel(file)
    else:
        return jsonify({'message': 'Unsupported file format'}), 400

    print(df)  # Debug: Check the content of the DataFrame

    name_columns = [col for col in df.columns if 'name' in col.lower()]
    standard_columns = [col for col in df.columns if 'standard' in col.lower()]
    marks_columns = [col for col in df.columns if col.lower() not in ['name', 'standard']]

    print(name_columns)
    print(standard_columns)
    print(marks_columns)

    if not (name_columns and standard_columns and marks_columns):
        return jsonify({'message': 'Invalid file format or column names not found'}), 400

    students = []
    for _, row in df.iterrows():
        name = row[name_columns[0]]
        standard = row[standard_columns[0]]
        marks = [row[col] for col in marks_columns]

        print(name, standard, marks)  # Check the extracted student data

        if name and standard and marks:
            student = {
                'name': name,
                'standard': standard,
                'marks': marks
            }
            students.append(student)

    print(students)  # Check the final list of students

    if students:
        students_collection.insert_many(students)
        return jsonify({'message': 'Student data uploaded successfully'}), 201
    else:
        return jsonify({'message': 'No valid student data found in the file'}), 400




def get_random_color():
    r = random.randint(0, 255)
    g = random.randint(0, 255)
    b = random.randint(0, 255)
    return f'rgb({r},{g},{b})'


if __name__ == '__main__':
    app.run(debug=True)