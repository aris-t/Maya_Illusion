# Detroit UI Video Overlay Project

## Project Structure
```
detroit-ui/
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   └── DetroitOverlay.js
│   │   ├── index.js
│   │   └── index.css
├── backend/
│   ├── requirements.txt
│   └── video_server.py
└── README.md
```

## Setup Instructions

1. Install frontend dependencies:
```bash
cd frontend
npm install
```

2. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Start the video server:
```bash
cd backend
python video_server.py
```

4. In a separate terminal, start the React app:
```bash
cd frontend
npm start
```

5. Open your browser to http://localhost:3000
