import {
  Person,
  Visibility,
  VisibilityOff
} from "@mui/icons-material";
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  CssBaseline,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const primaryBlue = "#0072BB";
const secondaryGreen = "#15A245";
const accentGreen = "#80C41C";
const darkBlue = "#004E80";
const white = "#ffffff";
const lightGray = "#f8f9fa";
const darkGray = "#495057";

const MAX_LOGIN_ATTEMPTS = 50;
const LOCKOUT_TIME = 5 * 60 * 1000;

const TIME_BASED_GREETINGS = {
  morning: { greeting: "Good morning! ☀️", message: "Have a great day ahead!" },
  afternoon: { greeting: "Good afternoon! 🌤️", message: "Hope your day is going well!" },
  evening: { greeting: "Good evening! 🌙", message: "Hope you had a wonderful day!" },
  night: { greeting: "Good night! 🌟", message: "Rest well for tomorrow!" }
};

const TIME_BASED_BACKGROUNDS = {
  morning: `linear-gradient(to bottom, #FFD700, #87CEEB)`,
  afternoon: `linear-gradient(to bottom, #4682B4, #87CEEB)`,
  evening: `linear-gradient(to bottom, #FF4500, #483D8B)`,
  night: `linear-gradient(to bottom, #00008B, #000000)`
};


const SEASONAL_DATA = {
  winter: { elements: "❄️", message: "Stay warm and productive! ❄️" },
  spring: { elements: "🌸", message: "New beginnings! 🌸" },
  summer: { elements: "☀️", message: "Stay cool and focused! ☀️" },
  fall: { elements: "🍂", message: "Embrace change! 🍂" }
};


const WEATHER_MESSAGES = {
  rain: "Rainy day? ☔ We've got cozy vibes inside.",
  snow: "Snow falling outside? ❄️ Perfect time to focus inside!",
  sunny: "Beautiful day! ☀️ Great time to be productive!",
  cloudy: "Cloudy skies? ⛅ Perfect conditions for focusing!",
  default: "Welcome back! We're glad to see you again ❤️"
};


const MOTIVATIONAL_SNIPPETS = [
  "You've got this 💪",
  "Small steps make big progress",
  "Keep going, you're doing great!",
  "Progress, not perfection",
  "Every accomplishment starts with the decision to try"
];

const redirectBasedOnRole = (role, navigate) => {
  switch (role) {
    case "superadmin":
      navigate("/super-admin");
      break;
    case "game_admin":
      navigate("/gamification-admin");
      break;
    case "user":
    default:
      navigate("/Game-dashboard");
  }
};
const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0) translateX(0) scale(1);
  }
  33% {
    transform: translateY(-20px) translateX(15px) scale(1.05);
  }
  66% {
    transform: translateY(10px) translateX(-15px) scale(0.95);
  }
`;

const slideUp = keyframes`
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeInOut = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
`;

const DynamicBackground = styled(Box)(({ timeofday }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: -3,
  overflow: "hidden",
  transition: "background 1.5s ease-in-out",
  background: TIME_BASED_BACKGROUNDS[timeofday] || TIME_BASED_BACKGROUNDS.morning,
}));

const HalfBackground = styled(Box)(({ timeofday }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: -2,
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    right: 0,
    width: "50%",
    height: "100%",
    background: `linear-gradient(135deg, ${darkBlue} 0%, ${primaryBlue} 100%)`,
    zIndex: 1,
    opacity: timeofday === "night" ? 0.8 : 1,
    "@media (max-width: 768px)": {
      width: "100%",
      opacity: 0.1
    }
  }
}));

const BackgroundElements = styled(Box)(() => ({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: -1,
  overflow: "hidden",
  pointerEvents: "none"
}));

const SeasonalElement = styled(Box)(() => ({
  position: "absolute",
  animation: `${floatAnimation} 20s infinite ease-in-out`,
  pointerEvents: "none",
  userSelect: "none",
  fontSize: "24px",
  opacity: 0.7
}));

const Circle = styled(Box)(({ delay, duration, size, color, left, top }) => ({
  position: "absolute",
  borderRadius: "50%",
  opacity: 0.06,
  animation: `${floatAnimation} ${duration}s infinite ease-in-out`,
  animationDelay: `${delay}s`,
  width: size,
  height: size,
  background: color,
  top: `${top}%`,
  left: `${left}%`
}));

const LoginContainer = styled(Paper)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(5px)",
  borderRadius: "16px",
  padding: "2rem",
  width: "90%",
  maxWidth: "450px",
  boxShadow: "0 15px 40px rgba(0, 0, 0, 0.12)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  animation: `${slideUp} 0.8s ease-out forwards`,
  opacity: 0,
  transform: "translateY(30px)",
  position: "relative",
  zIndex: 10,
  margin: "1rem",
  [theme.breakpoints.down('sm')]: {
    padding: "1.5rem",
    width: "95%",
    maxWidth: "none",
    margin: "0.5rem",
  }
}));

const StyledTextField = styled(TextField)(({ theme, isfocused }) => ({
  marginBottom: theme.spacing(3),
  transition: "all 0.3s ease",
  transform: isfocused ? "translateY(-2px)" : "none",
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: white,
    transition: "all 0.3s ease",
    "& fieldset": {
      border: "2px solid",
      borderColor: lightGray,
      transition: "all 0.3s ease"
    },
    "&:hover fieldset": {
      borderColor: alpha(accentGreen, 0.7),
    },
    "&.Mui-focused fieldset": {
      borderColor: accentGreen,
      boxShadow: "0 0 0 3px rgba(128, 196, 28, 0.2)"
    },
  },
  "& .MuiInputLabel-root": {
    color: darkBlue,
    fontWeight: 500
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: darkBlue,
  }
}));

const LoginButton = styled(Button)(() => ({
  width: "100%",
  padding: "15px",
  background: primaryBlue,
  color: white,
  border: "none",
  borderRadius: "10px",
  fontSize: "1.1rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 4px 12px rgba(0, 114, 187, 0.3)",
  marginBottom: "1.5rem",
  textTransform: "none",
  "&:hover": {
    background: darkBlue,
    transform: "translateY(-2px)",
    boxShadow: "0 6px 15px rgba(0, 114, 187, 0.4)"
  },
  "&:active": {
    transform: "translateY(0)"
  },
  "&:disabled": {
    background: lightGray,
    color: darkGray
  }
}));

const RememberForgot = styled(Box)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.5rem",
  fontSize: "0.95rem",
  "@media (max-width: 480px)": {
    flexDirection: "column",
    gap: "10px",
    alignItems: "flex-start"
  }
}));

const MotivationalText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  fontSize: "0.95rem",
  color: primaryBlue,
  fontStyle: "italic",
  margin: "1rem 0",
  animation: `${fadeInOut} 10s infinite`,
  minHeight: "24px",
  [theme.breakpoints.down('sm')]: {
    fontSize: "0.85rem",
    margin: "0.5rem 0"
  }
}));

const LoginPage = () => {
  const { user, initialCheckComplete, login } = useAuth();
  const navigate = useNavigate();
  const confettiRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [form, setForm] = useState({ user_id: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [timeOfDay, setTimeOfDay] = useState("morning");
  const [season, setSeason] = useState("spring");
  const [weather, setWeather] = useState("default");
  const [greeting, setGreeting] = useState(TIME_BASED_GREETINGS.morning);
  const [motivationalMessage, setMotivationalMessage] = useState("");

  useEffect(() => {
    const storedLockout = localStorage.getItem("lockoutUntil");
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem("lockoutUntil");
        localStorage.removeItem("loginAttempts");
      }
    }

    const storedAttempts = localStorage.getItem("loginAttempts");
    if (storedAttempts) {
      setLoginAttempts(parseInt(storedAttempts, 10));
    }
    
    const rememberedUser = localStorage.getItem("rememberedUser");
    if (rememberedUser) {
      setForm(JSON.parse(rememberedUser));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (initialCheckComplete && user) {
      redirectBasedOnRole(user.role, navigate);
    }
  }, [user, initialCheckComplete, navigate]);

  
  useEffect(() => {
    
    const hour = new Date().getHours();
    let newTimeOfDay = "morning";
    
    if (hour >= 5 && hour < 12) newTimeOfDay = "morning";
    else if (hour >= 12 && hour < 17) newTimeOfDay = "afternoon";
    else if (hour >= 17 && hour < 21) newTimeOfDay = "evening";
    else newTimeOfDay = "night";
    
    setTimeOfDay(newTimeOfDay);
    setGreeting(TIME_BASED_GREETINGS[newTimeOfDay]);
    
    const month = new Date().getMonth();
    let newSeason = "spring";
    
    if (month >= 2 && month < 5) newSeason = "spring";
    else if (month >= 5 && month < 8) newSeason = "summer";
    else if (month >= 8 && month < 11) newSeason = "fall";
    else newSeason = "winter";
    
    setSeason(newSeason);
    
    setMotivationalMessage(
      MOTIVATIONAL_SNIPPETS[Math.floor(Math.random() * MOTIVATIONAL_SNIPPETS.length)]
    );
    
    if (navigator.onLine) {
      getWeatherData();
    } else {
      setWeather("default");
    }
    
    const intervalId = setInterval(() => {
      const hour = new Date().getHours();
      let newTimeOfDay = "morning";
      
      if (hour >= 5 && hour < 12) newTimeOfDay = "morning";
      else if (hour >= 12 && hour < 17) newTimeOfDay = "afternoon";
      else if (hour >= 17 && hour < 21) newTimeOfDay = "evening";
      else newTimeOfDay = "night";
      
      setTimeOfDay(newTimeOfDay);
      setGreeting(TIME_BASED_GREETINGS[newTimeOfDay]);
    }, 3600000);

    return () => clearInterval(intervalId);
  }, []);

  const getWeatherData = async () => {
    try {
      
      setWeather("default");
    } catch (error) {
      setWeather("default");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleFocus = (fieldName) => {
    setFocusedField(fieldName);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const handleRememberMe = (e) => {
    setRememberMe(e.target.checked);
    if (!e.target.checked) {
      localStorage.removeItem("rememberedUser");
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: [primaryBlue, secondaryGreen, accentGreen, darkBlue]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (lockoutUntil && lockoutUntil > Date.now()) {
      const minutesLeft = Math.ceil((lockoutUntil - Date.now()) / 60000);
      setError(`Too many failed attempts. Please try again in ${minutesLeft} minute(s).`);
      return;
    }

    setLoading(true);

    if (!/^\d+$/.test(form.user_id)) {
      setError("User ID must be numeric");
      setLoading(false);
      return;
    }

    if (form.password.length < 3) {
      setError("Password must be at least 3 characters");
      setLoading(false);
      return;
    }

    try {
      await login(form);
      if (rememberMe) {
        localStorage.setItem("rememberedUser", JSON.stringify(form));
      } else {
        localStorage.removeItem("rememberedUser");
      }
      
      setLoginAttempts(0);
      localStorage.removeItem("loginAttempts");
      localStorage.removeItem("lockoutUntil");

      triggerConfetti();
    } catch (err) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem("loginAttempts", newAttempts.toString());

      let errorMsg = "Invalid credentials. Please try again.";

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_TIME;
        setLockoutUntil(lockoutTime);
        localStorage.setItem("lockoutUntil", lockoutTime.toString());
        errorMsg = `Too many failed attempts. Account locked for ${LOCKOUT_TIME / 60000} minutes.`;
      }

      setError(errorMsg);
      setLoading(false);
    }
  };

  const createBackgroundElements = () => {
    const circles = [];
    const colors = [primaryBlue, secondaryGreen, accentGreen];
    
    for (let i = 0; i < 12; i++) {
      const size = Math.random() * 100 + 20;
      const color = colors[Math.floor(Math.random() * colors.length)];
      let left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 15 + Math.random() * 10;
      if (Math.random() > 0.3) {
        left = Math.random() * 45;
      }
      
      circles.push(
        <Circle
          key={i}
          size={size}
          color={color}
          left={left}
          top={top}
          delay={delay}
          duration={duration}
        />
      );
    }
    
    return circles;
  };

  const createSeasonalElements = () => {
    const elements = [];
    const count = timeOfDay === "night" ? 15 : 10;
    
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 24 + 16;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 20 + Math.random() * 10;
      
      elements.push(
        <SeasonalElement
          key={i}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            fontSize: `${size}px`
          }}
        >
          {SEASONAL_DATA[season].elements}
        </SeasonalElement>
      );
    }
    
    return elements;
  };

  if (!initialCheckComplete) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: white
        }}
      >
        <CircularProgress sx={{ color: primaryBlue, mb: 2 }} />
      </Box>
    );
  }

  return (
    <>
      <CssBaseline />
      <DynamicBackground timeofday={timeOfDay} />
      <HalfBackground timeofday={timeOfDay} />
      
      <BackgroundElements>
        {createBackgroundElements()}
        {createSeasonalElements()}
      </BackgroundElements>
      
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: isMobile ? 1 : 2
        }}
      >
        <LoginContainer elevation={3}>
          <Box sx={{ textAlign: "center", mb: isMobile ? 1 : 2 }}>
            <Typography
              variant={isMobile ? "h5" : "h3"}
              sx={{
                fontWeight: 800,
                background: `linear-gradient(to right, ${darkBlue} 0%, ${primaryBlue} 100%)`,
                backgroundClip: "text",
                textFillColor: "transparent",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                mb: 1
              }}
            >
              {greeting.greeting}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ 
                color: darkGray, 
                fontSize: isMobile ? "0.9rem" : "1rem", 
                fontWeight: 500, 
                mb: 1 
              }}
            >
              {greeting.message}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ 
                color: darkBlue, 
                fontSize: isMobile ? "1rem" : "1.1rem", 
                fontWeight: 600 
              }}
            >
              Ethiotelecom Gamification
            </Typography>
          </Box>

          <MotivationalText>
            {motivationalMessage}
          </MotivationalText>

          {weather !== "default" && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: isMobile ? "0.8rem" : "1rem" }}>
              {WEATHER_MESSAGES[weather] || WEATHER_MESSAGES.default}
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 2, fontSize: isMobile ? "0.8rem" : "1rem" }}
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            <StyledTextField
              label="User ID"
              name="user_id"
              value={form.user_id}
              onChange={handleChange}
              onFocus={() => handleFocus("user_id")}
              onBlur={handleBlur}
              isfocused={focusedField === "user_id" ? "true" : undefined}
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Person sx={{ color: darkGray }} />
                  </InputAdornment>
                ),
              }}
            />

            <StyledTextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              onFocus={() => handleFocus("password")}
              onBlur={handleBlur}
              isfocused={focusedField === "password" ? "true" : undefined}
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePassword}
                      edge="end"
                      size="small"
                      sx={{ color: darkGray }}
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <RememberForgot>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={rememberMe}
                    onChange={handleRememberMe}
                    sx={{ 
                      color: accentGreen,
                      '&.Mui-checked': {
                        color: accentGreen,
                      },
                    }}
                  />
                }
                label="Remember me"
              />
            </RememberForgot>

            <LoginButton
              type="submit"
              disabled={loading || !form.user_id || !form.password || (lockoutUntil && lockoutUntil > Date.now())}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <>Login to Platform</>
              )}
            </LoginButton>
          </form>
        </LoginContainer>
      </Box>
      <canvas ref={confettiRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }} />
    </>
  );
};

export default LoginPage;