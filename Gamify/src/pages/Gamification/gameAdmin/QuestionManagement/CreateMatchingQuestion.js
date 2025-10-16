import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import axios from 'axios';

const MatchingQuiz = () => {
  const { user } = useAuth();
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    pairs: [{ left: '', right: '' }]
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuizData(prev => ({ ...prev, [name]: value }));
  };

  const handlePairChange = (index, field, value) => {
    const newPairs = [...quizData.pairs];
    newPairs[index][field] = value;
    setQuizData(prev => ({ ...prev, pairs: newPairs }));
  };

  const addPair = () => {
    setQuizData(prev => ({
      ...prev,
      pairs: [...prev.pairs, { left: '', right: '' }]
    }));
  };

  const removePair = (index) => {
    if (quizData.pairs.length <= 1) return;
    const newPairs = [...quizData.pairs];
    newPairs.splice(index, 1);
    setQuizData(prev => ({ ...prev, pairs: newPairs }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5030/api/quizzes/matching', {
        ...quizData,
        created_by: user.user_id
      });

      setMessage('Matching quiz created successfully!');
      setQuizData({
        title: '',
        description: '',
        pairs: [{ left: '', right: '' }]
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      setMessage('Failed to create quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="matching-quiz-container">
      <h2>Create Matching Quiz</h2>
      {message && <div className="message">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            name="title"
            value={quizData.title}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description:</label>
          <textarea
            name="description"
            value={quizData.description}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="pairs-section">
          <h3>Matching Pairs</h3>
          {quizData.pairs.map((pair, index) => (
            <div key={index} className="pair-row">
              <input
                type="text"
                placeholder="Left item"
                value={pair.left}
                onChange={(e) => handlePairChange(index, 'left', e.target.value)}
                required
              />
              <span>matches with</span>
              <input
                type="text"
                placeholder="Right item"
                value={pair.right}
                onChange={(e) => handlePairChange(index, 'right', e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => removePair(index)}
                disabled={quizData.pairs.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
          
          <button type="button" onClick={addPair} className="add-pair-btn">
            Add Another Pair
          </button>
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Quiz'}
        </button>
      </form>
    </div>
  );
};

export default MatchingQuiz;