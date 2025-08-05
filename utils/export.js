module.exports = {
  generateCSV: async (formId, supabase) => {
    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('form_id', formId);

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