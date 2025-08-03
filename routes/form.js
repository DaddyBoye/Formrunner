module.exports = (supabase) => async (req, res) => {
  const { id } = req.params;
  const { data: form } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single();

  if (!form) {
    return res.status(404).send('Form not found');
  }

  const whatsappLink = `https://wa.me/${process.env.USER_BOT_NUMBER}?text=FILL_${id}`;
  
  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${form.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
        .whatsapp-btn {
          display: block; background: #25D366; color: white;
          text-align: center; padding: 15px; border-radius: 8px;
          text-decoration: none; margin: 20px 0; font-size: 18px;
        }
      </style>
    </head>
    <body>
      <h1>${form.title}</h1>
      <p>${form.fields.length} questions • 2-3 minutes</p>
      <a href="${whatsappLink}" class="whatsapp-btn">
        Open in WhatsApp
      </a>
    </body>
    </html>
  `);
};