result = await postData(
  'https://api.openai.com/v1/chat/completions',
  "this is my question"
);
result = JSON.parse(result.choices[0].message.content);
result = result.question;
setQuestion(result);


async function postData(url, message) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer my-openai-key`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-1106",
      response_format: { "type": "json_object" },
      messages: message
    }),
  });
  return response.json();
}

// example 2

export async function gptEndpoint(url, message) {
  const response = await fetch(
    "https://api.openai.com/v1/chat/completions", {
    method: 'POST',
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer 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`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      response_format: { "type": "json_object" },
      messages: [
        {
          "role": "system",
          "content": "Eres un profesor de idioma español"
        },
        {
          "role": "user",
          "content": "Este es una mensaje de prueba"
        }
      ]
    }),
  });
  return response.json();
}