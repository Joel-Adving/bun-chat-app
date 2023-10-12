import { For, createEffect, createSignal, onCleanup, onMount } from "solid-js";

const API_URL = import.meta.env.PUBLIC_API_URL;
const WS_URL = import.meta.env.PUBLIC_WS_URL;

type Room = {
  creator: string;
  name: string;
  roomId: number;
  usersInRoom: string[];
};

export default function Chat() {
  const [error, setError] = createSignal<string>("");
  const [rooms, setRooms] = createSignal<Room[]>([]);
  const [socket, setSocket] = createSignal<WebSocket>();
  const [username, setUsername] = createSignal<string>("");
  const [messages, setMessages] = createSignal<string[]>([]);
  const [connected, setConnected] = createSignal<boolean>(false);
  const [firstMessage, setFirstMessage] = createSignal<boolean>(true);
  const [messagesContainer, setMessagesContainer] = createSignal<HTMLElement>();
  const [selectedRoom, setSelectedRoom] = createSignal<Room | undefined>(
    undefined,
  );

  async function connectToRoom(
    e: Event & {
      currentTarget: HTMLFormElement;
    },
  ) {
    e.preventDefault();

    if (!username()) {
      return;
    }

    let selectedRoomId;

    if (e.currentTarget) {
      const formData = new FormData(e.currentTarget);
      const roomName = formData.get("create-room-name");

      if (roomName) {
        const roomAlreadyExists = rooms().find(
          (room) =>
            room.name.toLocaleLowerCase() ===
            roomName.toString().toLocaleLowerCase(),
        );
        if (roomAlreadyExists) {
          setError("Room with this name already exists");
          return;
        }

        try {
          const res = await fetch(`${API_URL}/rooms`, {
            method: "POST",
            body: JSON.stringify({
              name: roomName,
              creator: username(),
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (res.ok) {
            const data = await res.json();
            selectedRoomId = data.roomId;
            setRooms((prev) => [...prev, data]);
          }
        } catch (e) {
          console.log(e);
        }
      }
    }

    try {
      const res = await fetch(`${API_URL}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.log(e);
    }

    if (!selectedRoomId) {
      selectedRoomId = selectedRoom()?.roomId;
    }

    const socket = new WebSocket(
      `${WS_URL}/room/${selectedRoomId}?username=${username()}`,
    );

    socket.onopen = function (e) {
      console.log("ws connected");
    };

    socket.onclose = function (e) {
      console.log("ws connection closed");
    };

    window.onbeforeunload = function () {
      if (socket.readyState == WebSocket.OPEN) {
        socket.close(
          1000,
          "window.onbeforeunload: Closing connection when leaving page",
        );
      }
    };

    socket.addEventListener("message", (event) => {
      if (event.data) {
        if (firstMessage()) {
          const data = event.data.split("\n");
          if (data.length > 0) {
            setMessages(data);
          }
          setFirstMessage(false);
        } else {
          setMessages((prev) => [...prev, event.data]);
        }
        const container = messagesContainer();
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }
    });

    setSocket(socket);
    setConnected(true);
    localStorage.setItem("username", username());
  }

  function handleSendMessage(
    e: Event & {
      currentTarget: HTMLFormElement;
    },
  ) {
    e.preventDefault();
    const target = e.currentTarget;
    if (target) {
      const formData = new FormData(target);
      const message = formData.get("message");
      if (message) {
        socket()?.send(message.toString());
        target.reset();
      }
    }
  }

  function handleSelectRoom(
    e: InputEvent & {
      target: HTMLSelectElement;
    },
  ) {
    const roomId = parseInt(e.target.value);
    const room = rooms().find((room) => room.roomId === roomId);
    if (room) {
      setSelectedRoom(room);
    }
  }

  function leaveRoom() {
    socket()?.close(1000, `${username} disconnected`);
    setSocket(undefined);
    setError("");
    setMessages([]);
    setMessagesContainer(undefined);
    setFirstMessage(true);
    setConnected(false);
  }

  onMount(async () => {
    setUsername(localStorage.getItem("username") ?? "");
    try {
      const res = await fetch(`${API_URL}/rooms`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        setSelectedRoom(data[0]);
      }
    } catch (e) {
      console.log(e);
    }
  });

  createEffect(() => {
    if (connected()) {
      setMessagesContainer(
        document.querySelector("#messagesContainer") as HTMLElement,
      );
    }
  });

  onCleanup(() => {
    socket()?.close();
  });

  return (
    <div class="max-w-2xl w-full mx-auto text-white py-20 h-[100dvh] relative grid place-items-center text-2xl">
      {!connected() ? (
        <form onSubmit={connectToRoom} class="flex flex-col gap-5">
          <label class="flex flex-col gap-2">
            Username
            <input
              name="username"
              required
              value={username()}
              onInput={(e) => setUsername(e.target.value)}
              min="3"
              class="bg-transparent border rounded px-5 py-2"
            />
          </label>
          <label class="flex flex-col gap-2">
            Join room
            <select
              class="bg-transparent border rounded px-5 py-2"
              name="select-room"
              value={selectedRoom()?.roomId}
              onInput={handleSelectRoom}
            >
              <For each={rooms()}>
                {(room) => (
                  <option
                    class="bg-black border rounded px-5 py-2"
                    value={room.roomId}
                  >
                    {room.name}
                  </option>
                )}
              </For>
            </select>
          </label>

          <label class="flex flex-col gap-2">
            Create new room
            <input
              name="create-room-name"
              class="bg-transparent border rounded px-5 py-2"
            />
          </label>
          {error() && <p class="text-red-500">{error()}</p>}
          <button type="submit" class="border rounded px-6 py-2">
            Connect
          </button>
        </form>
      ) : (
        <div class="sm:bottom-[15%] bottom-[1rem] fixed max-w-[30rem] w-full px-4">
          <div
            id="messagesContainer"
            class="overflow-y-auto sm:max-h-[calc(65dvh-5rem)] max-h-[calc(91.5dvh-5rem)] pb-4 flex flex-col gap-1"
          >
            <For each={messages()}>{(message) => <p>{message}</p>}</For>
          </div>
          <div class="flex flex-col gap-4">
            <form onSubmit={handleSendMessage}>
              <input
                type="text"
                name="message"
                class="bg-transparent border rounded px-5 py-2 w-full"
              />
              <button type="submit"></button>
            </form>
            <button
              class="text-2xl border rounded px-6 py-2 w-fit mx-auto"
              onClick={leaveRoom}
            >
              Leave room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
