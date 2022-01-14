const chatForm = document.querySelector("#chat-form");
const usersField = document.querySelector("#users");
const chatMessages = document.querySelector(".chat-messages");
const chatContainer = document.querySelector(".chat-container");
const { username, room } = chatContainer.dataset;

const socket = io();

//Join room
socket.emit("joinRoom", { username, room });

socket.on("roomUsers", ({ room, users }) => {
  let content = '';
  users.forEach(user => {
    content += /*html*/`
      <li>${user.username}</li>
    `
  });
  usersField.innerHTML = content;
})

//message from server
//jika on ada disini maka emit nya hrs dari server
socket.on('message', message => {
  console.log(message);
  outputMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
})//mengambil data dari io.emit

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  //get a message text
  const msg = e.target.children.msg.value;
  //memasukkan data ke server
  socket.emit('chatMessage', msg);
  //mengosongkan isi msg
  e.target.children.msg.value = "";
  e.target.children.msg.focus();
});

const outputMessage = message => {
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML = /*html*/ `
        <p class="meta">${message.username} <span>${message.time}</span></p>
        <p class="text">
          ${message.text}
        </p>
  `;
  chatMessages.append(div);
}