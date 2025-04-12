import React from 'react';
import './App.css';
import PostingApp from './components/PostingApp';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Tralelero Tralala</h1>
        <p>A community for sharing your thoughts</p>
      </header>
      
      <main>
        <PostingApp />
      </main>
    </div>
  );
}

export default App;
