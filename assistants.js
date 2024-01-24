import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: "my-openai-key",
  dangerouslyAllowBrowser: true,
});

// PASO 1:
/**
 * Este paso es controversial, el asistente se puede crear directamente desde código. Sin embargo,
 * para mi es bueno tenerlo creado en openAI, y tomar su assistant_id, ya que queremos que
 * el asistente siempre sea el mismo. Análogamente, es totalmente posible persistir ese id con
 * una base de datos etc.
 * 
 * Podemos obtener el asistente con
 * await openai.beta.assistants.retrieve("your_id")
 */
// const assistant = await openai.beta.assistants.create({
//   name: "Hockey Expert",
//   instructions: "You are a hockey expert. You specialize in helping others learn about hockey.",
//   tools: [{ type: "code_interpreter" }],
//   model: "gpt-4-1106-preview",
// });

// PASO 2
/**
 * Según la documentación se recomienda crear un hilo por usuario cuando
 * este inicia la conversación
 * 
 * Se puede agregar tantos mensajes como se quiera
 * 
 * OpenAI gestionará la ventana de contexto según la longitud del mensaje, esto
 * significa que si reutilizamos el mismo hilo para el usuario el modelo
 * recordará las conversaciones pero estamos sujetos al pricing de uso del modelo
 * 
 * Al igual que con el asistente, podemos obtener el thread con el método
 * await openai.beta.threads.retrieve(your_id);
 */
async function createNewThread() {
  return await openai.beta.threads.create();
}

// PASO 3
/**
 * Agregamos el mensaje a nuestro hilo, puede ser este y muchos mas.
 * 
 * Podemos ver todos los mensajes en un hilo invocando este endpoint
 * https://platform.openai.com/docs/api-reference/messages/listMessages
 * 
 * Como vimos antes entre mas mensajes el hilo tendrá mas contexto
 */
async function addMessageToThread(thread, message) {
  await openai.beta.threads.messages.create(
    thread.id,
    {
      role: "user",
      content: message // "I need to solve the equation `3x + 11 = 14`. Can you help me?",
    }
  );
}

// PASO 4
/**
 * Para que el asistente responda al mensaje del usuario, necesitamos crear un Run.
 * esto hace que el asistente lea el hilo y decida qué hacer.
 * 
 * El Run progresa y el asistente mete mensajes en el hilo con el rol "assistant"
 */
async function requestAssistantAnswer(thread, assistant) {
  return await openai.beta.threads.runs.create(
    thread.id,
    {
      assistant_id: assistant.id,
      // Es posible darle nuevas instrucciones aquí pero estás sobreescribirán las del asistente...
      // cosa que no parece tan conveniente
      // instructions: "Please address the user as Jane Doe. The user has a premium account."
    }
  );
}

// PASO 5
/**
 * Aqui se hace algo raro, debemos esperar a que el asistente responda y meta la respuesta en el hilo,
 * no hay certeza de cuanto tarde en responder así que veo muchas implementaciones con un ciclo
 * que pregunta cada cierto tiempo.
 * 
 * Me imagino que en futuras versiones estó será mejor manejado, pero por ahora esta es una solución
 * 
 */
async function isResponseReady(thread, run) {
  let attempts = 0;
  let response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (response.status === "in_progress" || response.status === "queued") {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    if (attempts > 4) return false;
    attempts++;
  }
  return true;
}

// PASO 6
/**
 * En este punto ya tenemos certeza de que el asistente respondió, por lo que podemos sacar
 * la lista de mensajes de nuestro hilo. 
 *
 * Ya depende del comportamiento que queremos, pero en este ejemplo se saca el último mensaje
 * emitido por el asistente. Como vimos mas adelante, el rol que tiene el mensaje emitido por 
 * el asistente es de role: "assistant"
 */
async function getLastAssistantMessage(thread, run) {
  const messageList = await openai.beta.threads.messages.list(thread.id);

  const lastMessage = messageList.data
    .filter((message) => message.run_id === run.id && message.role === "assistant")
    .pop();

  // Print the last message coming from the assistant
  if (lastMessage) {
    return lastMessage.content[0]["text"].value;
  }
  return "Error";
}

export default async function getAssistantResponse(assistant, thread, message) {
  await addMessageToThread(thread, message);
  const run = await requestAssistantAnswer(thread, assistant);
  const isReady = await isResponseReady(thread, run);
  if (isReady) return getLastAssistantMessage(thread, run);
  return "Error";
}
