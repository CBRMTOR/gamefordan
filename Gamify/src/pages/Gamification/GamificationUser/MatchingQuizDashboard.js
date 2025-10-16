import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const MatchingQuizDashboard = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(`http://localhost:5030/api/quizzes/matching/${8}`);
        setQuiz(response.data);
      
        const initialAnswers = {};
        response.data.pairs.forEach(pair => {
          initialAnswers[pair.pair_id] = '';
        });
        setAnswers(initialAnswers);
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setError('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuiz();
  }, [id]);

  const handleAnswerChange = (pairId, value) => {
    setAnswers(prev => ({
      ...prev,
      [pairId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const answerArray = Object.keys(answers).map(pairId => ({
        pairId: parseInt(pairId),
        selectedRight: answers[pairId]
      }));
      
      const response = await axios.post('http://localhost:5030/api/quizzes/attempt', {
        quizId: quiz.quiz_id,
        userId: user.user_id,
        answers: answerArray
      });
      
      setResult(response.data);
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !quiz) {
    return <div>Loading quiz...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  if (submitted && result) {
    return (
      <div className="quiz-result">
        <h2>Quiz Results</h2>
        <h3>{quiz.title}</h3>
        <div className="score">
          Your score: {result.score.toFixed(1)}% ({result.correctCount} out of {result.totalQuestions} correct)
        </div>
        <button onClick={() => navigate('/quizzes')}>Back to Quizzes</button>
      </div>
    );
  }

  const rightOptions = quiz.pairs.map(pair => pair.right_text);
  const shuffledRightOptions = [...rightOptions].sort(() => Math.random() - 0.5);

  return (
    <div className="matching-quiz-dashboard">
      <h2>{quiz.title}</h2>
      <p>{quiz.description}</p>
      
      <form onSubmit={handleSubmit}>
        <div className="matching-pairs">
          {quiz.pairs.map(pair => (
            <div key={pair.pair_id} className="matching-pair">
              <div className="left-item">{pair.left_text}</div>
              <span>matches with</span>
              <select
                value={answers[pair.pair_id] || ''}
                onChange={(e) => handleAnswerChange(pair.pair_id, e.target.value)}
                required
                disabled={loading}
              >
                <option value="">Select match</option>
                {shuffledRightOptions.map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </form>
    </div>
  );
};

export default MatchingQuizDashboard;