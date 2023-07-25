import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as Chartjs, ArcElement, Tooltip, Legend } from 'chart.js';
import './App.css';

Chartjs.register(ArcElement, Tooltip, Legend);

const StudentPerformance = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [name, setName] = useState('');
  const [standard, setStandard] = useState('');
  const [file, setFile] = useState(null);
  const subjectsList = ['Telugu', 'Maths', 'Science', 'Social', 'Hindi', 'English'];
  const [marks, setMarks] = useState(Array(subjectsList.length).fill(''));

  const handleSubmit = (e) => {
    e.preventDefault();
  
    if (file || marks.every((mark) => mark !== '')) {
      const newStudent = {
        name: file ? file.name : name,
        standard: file ? 'N/A' : standard,
        marks: marks.map((mark) => parseInt(mark)),
      };
  
      fetch('http://localhost:5000/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStudent),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          if (file) {
            // File upload successful, now upload the file separately
            uploadFile();
          } else {
            fetchData();
          }
        })
        .catch((error) => {
          console.log('Error:', error);
        });
  
      setName('');
      setStandard('');
      setMarks(Array(subjectsList.length).fill(''));
      setFile(null);
    }
  };
  
  const uploadFile = () => {
    const formData = new FormData();
    formData.append('file', file);
  
    fetch('http://localhost:5000/upload', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        fetchData();
      })
      .catch((error) => {
        console.log('Error:', error);
      });
  };
  

  const handleMarkChange = (e, index) => {
    const updatedMarks = [...marks];
    updatedMarks[index] = e.target.value;
    setMarks(updatedMarks);
    setFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
      setFile(file);
      setMarks(Array(subjectsList.length).fill(''));
    } else {
      console.log('Invalid file type');
    }
  };

  const fetchData = () => {
    fetch('http://localhost:5000/students')
      .then((response) => response.json())
      .then((data) => {
        // Group students by name
        const studentsMap = new Map();
        data.forEach((student) => {
          if (studentsMap.has(student.name)) {
            // If the student with the same name already exists, update the marks
            const existingStudent = studentsMap.get(student.name);
            existingStudent.marks = student.marks;
          } else {
            // Add the student to the map
            studentsMap.set(student.name, student);
          }
        });

        // Convert the map back to an array of students
        const updatedStudents = Array.from(studentsMap.values());

        setStudents(updatedStudents);
      })
      .catch((error) => {
        console.log('Error:', error);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    const randomColor = subjectsList.map(() => {
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    });
    return randomColor;
  };

  const chartData = {
    labels: subjectsList,
    datasets: [
      {
        data: selectedStudent ? selectedStudent.marks : [],
        backgroundColor: getRandomColor(),
      },
    ],
  };

  const totalMarksData = {
    labels: students.map((student) => student.name),
    datasets: [
      {
        data: students.map((student) =>
          student.marks.reduce((sum, mark) => sum + mark, 0)
        ),
        backgroundColor: getRandomColor(),
      },
    ],
  };

  const handleClick = (student) => {
    setSelectedStudent(student);
  };

  return (
    <div className="container student-performance">
      <h1>Student Performance</h1>
      <form onSubmit={handleSubmit}>
        {file ? (
          <p>File uploaded: {file.name}</p>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="standard">Standard:</label>
              <input
                type="text"
                id="standard"
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                required
              />
            </div>
          </>
        )}

        {file ? (
          <p>File uploaded</p>
        ) : (
          <div className="form-group">
            {subjectsList.map((subject, index) => (
              <div key={index} className="subject-input">
                <label htmlFor={`mark-${index}`}>{subject}:</label>
                <input
                  type="text"
                  id={`mark-${index}`}
                  value={marks[index]}
                  onChange={(e) => handleMarkChange(e, index)}
                  required={!file}
                  disabled={file}
                />
              </div>
            ))}
          </div>
        )}

        {!file && (
          <div className="form-group">
            <input
              type="file"
              id="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              required={!marks.some((mark) => mark !== '')}
              disabled={marks.some((mark) => mark !== '')}
            />
          </div>
        )}

        <button type="submit">Submit</button>
      </form>

      {students.length > 0 && (
        <div className="chart-container">
          <h2>Student Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Standard</th>
                {subjectsList.map((subject, index) => (
                  <th key={index}>{subject}</th>
                ))}
                <th>Total Marks</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr
                  key={index}
                  className={`student-row-${index}`}
                  onClick={() => handleClick(student)}
                >
                  <td>{student.name}</td>
                  <td>{student.standard}</td>
                  {student.marks.map((mark, markIndex) => (
                    <td key={markIndex}>{mark}</td>
                  ))}
                  <td>{student.marks.reduce((sum, mark) => sum + mark, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pie data={chartData} />
          <h2>Total Marks</h2>
          <Pie data={totalMarksData} />
        </div>
      )}
    </div>
  );
};

export default StudentPerformance;
