const port = 5077


const express = require("express")
const app = express()
const cors = require('cors')
const http = require('http');
const server = http.createServer(app)
const {Server} = require("socket.io")
const io = new Server(server,
    {
        cors: {origin: "*"},
        pingTimeout: 1000,
        pingInterval: 1000,
    });

app.use(cors())

const games = {}
const players = {}

const getRandomRoom = () => {
    return Math.floor(Math.random() * 99999) + 10000
}

const getFullGameInfo = (room) => {
    const game = JSON.parse(JSON.stringify(games[room]))
    game.players = game?.players.map(socketId => players[socketId])

    return game
}

const shuffle = (array) => {
    let currentIndex = array.length, randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

const getSpyCount = (playersCount) => {
    if (playersCount < 7) return 1
    if (playersCount < 14) return 2
    if (playersCount < 21) return 3
    return Math.floor(playersCount / 7)
}

app.get("/", (req, res) => {
    res.send(JSON.stringify(games) + "\n" + JSON.stringify(players))
})


io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on("start online", () => {
        socket.emit("goto online")
    })

    socket.on("create room", (user) => {
        let room = getRandomRoom()
        room = room + ""

        console.log("Created room " + room)

        socket.join(room)
        socket.data.room = room
        socket.data.user = user

        games[room + ""] = {players: [socket.id], started: false, timerId: false}
        players[socket.id] = user
        socket.emit("room connected", {room, roomInfo: getFullGameInfo(room)})
        io.to(room).emit("update game", {roomInfo: getFullGameInfo(room)})
    })

    socket.on("connect room", ({room, user}) => {
        if (games[room + ""] && !games[room + ""]?.started) {
            console.log("Connected to room " + room)
            room = room + ""
            socket.join(room)
            socket.data.room = room
            socket.data.user = user

            games[room + ""].players.push(socket.id)
            players[socket.id] = user
            socket.emit("room connected", {room, roomInfo: getFullGameInfo(room)})
            io.to(room).emit("update game", {roomInfo: getFullGameInfo(room)})
        } else {
            socket.emit("room not found")
        }

    })

    socket.on("disconnect", () => {
        const deleteIndex = games[socket.data.room]?.players.indexOf(socket.id)
        console.log(games[socket.data.room]?.players, socket.id, deleteIndex)
        delete players[socket.id]

        if (deleteIndex >= 0) {
            games[socket.data.room]?.players.splice(deleteIndex, 1)

            if (games[socket.data.room].players.length === 0) {
                console.log("All players leave")
                clearTimeout(games[socket.data.room].timerId)
                delete games[socket.data.room]
            } else {
                io.to(socket.data.room).emit("update game", {roomInfo: getFullGameInfo(socket.data.room)})
            }
        }
    })

    socket.on("leave", () => {
        const deleteIndex = games[socket.data.room]?.players.indexOf(socket.id)
        console.log(games[socket.data.room]?.players, socket.id, deleteIndex)
        delete players[socket.id]

        if (deleteIndex >= 0) {
            games[socket.data.room]?.players.splice(deleteIndex, 1)

            if (games[socket.data.room].players.length === 0) {
                console.log("All players leave")
                clearTimeout(games[socket.data.room].timerId)
                delete games[socket.data.room]
            } else {
                io.to(socket.data.room).emit("update game", {roomInfo: getFullGameInfo(socket.data.room)})
            }
        }
    })

    socket.on("start game", (location) => {
        console.log("start game ", location)
        games[socket.data.room].started = true

        const playersCount = games[socket.data.room].players.length
        const spyCount = getSpyCount(playersCount)
        const playerRoleList = shuffle([...Array(playersCount - spyCount).fill(false), ...Array(spyCount).fill(true)])

        games[socket.data.room].players.forEach((player, i) => {
            players[player].role = playerRoleList[i]
            io.to(player).emit("set role", playerRoleList[i])
        })

        const timer = setTimeout(() => {
            io.to(socket.data.room).emit("game end", getFullGameInfo(socket.data.room))
        }, (games[socket.data.room].players.length * 60) * 1000)

        games[socket.data.room].timerId = timer

        io.to(socket.data.room).emit("game started", {
            location,
            timer: (games[socket.data.room].players.length * 60) * 1000
        })
    })
});

server.listen(port, () => {
    console.log("Listening")
})
