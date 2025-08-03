module.exports = {
  generateCSV: (responses, form) => {
    let csv = 'User,Timestamp,';
    form.fields.forEach(f => csv += `${f.question.replace(/,/g, ';')},`);
    csv += '\n';
    
    responses.forEach(res => {
      csv += `${res.user_number},${res.created_at},`;
      form.fields.forEach(f => {
        csv += `${(res.answers[f.question] || '').replace(/,/g, ';')},`;
      });
      csv += '\n';
    });
    
    return csv;
  }
};