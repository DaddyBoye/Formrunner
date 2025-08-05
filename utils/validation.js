module.exports = (input, field) => {
  if (!field?.type) return null;
  
  const trimmedInput = input.trim();
  
  switch(field.type) {
    case 'number':
      if (!/^\d+$/.test(trimmedInput)) return field.errorMsg || 'Numbers only please';
      break;
      
    case 'email':
      if (!/[^@]+@[^@]+\.[^@]+/.test(trimmedInput)) 
        return field.errorMsg || 'Please enter a valid email';
      break;
      
    case 'rating':
      if (!/^[1-5]$/.test(trimmedInput)) 
        return field.errorMsg || 'Please rate between 1-5';
      break;
      
    case 'phone':
      if (!/^\+?[\d\s-]{10,}$/.test(trimmedInput)) 
        return field.errorMsg || 'Please enter a valid phone number';
      break;
      
    case 'yesno':
      if (!/^(yes|no)$/i.test(trimmedInput)) 
        return field.errorMsg || 'Please answer Yes or No';
      break;
  }
  
  return null;
};