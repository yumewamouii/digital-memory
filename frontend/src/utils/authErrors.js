const DETAIL_MESSAGES = {
  "Email already registered": "Пользователь с такой почтой уже зарегистрирован",
  "User not found": "Пользователь с такой почтой не найден",
  "Invalid password": "Неверный пароль",
  "Invalid credentials": "Неверная почта или пароль",
};

const FIELD_MESSAGES = {
  email: {
    value_error: "Укажите корректную почту",
  },
  password: {
    string_too_short: "Пароль должен содержать не менее 8 символов",
    string_too_long: "Пароль слишком длинный",
  },
};

function mapValidationError(item) {
  const field = item.loc?.[item.loc.length - 1];
  const fieldMessages = FIELD_MESSAGES[field];
  if (fieldMessages?.[item.type]) {
    return fieldMessages[item.type];
  }

  if (field === "email") {
    return "Укажите корректную почту";
  }
  if (field === "password") {
    return "Пароль должен содержать не менее 8 символов";
  }

  return item.msg || "Проверьте правильность введённых данных";
}

export function getAuthErrorMessage(error, fallback) {
  if (!error.response) {
    return "Не удалось связаться с сервером. Проверьте, что backend запущен.";
  }

  const { detail } = error.response.data ?? {};

  if (typeof detail === "string") {
    return DETAIL_MESSAGES[detail] || detail;
  }

  if (Array.isArray(detail)) {
    return detail.map(mapValidationError).join(". ");
  }

  return fallback;
}

export function validateRegisterForm({ email, password }) {
  if (!email.trim()) {
    return "Укажите почту";
  }
  if (!password) {
    return "Укажите пароль";
  }
  if (password.length < 8) {
    return "Пароль должен содержать не менее 8 символов";
  }
  return null;
}

export function validateLoginForm({ email, password }) {
  if (!email.trim()) {
    return "Укажите почту";
  }
  if (!password) {
    return "Укажите пароль";
  }
  return null;
}
