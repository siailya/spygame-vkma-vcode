import React, {useEffect, useRef, useState} from "react";
import {
    AppRoot,
    Avatar,
    Button,
    Caption,
    Card,
    Div,
    FixedLayout,
    FormItem,
    Group,
    Header,
    Headline,
    Input,
    ModalCard,
    ModalRoot,
    Panel,
    PanelHeader,
    PanelHeaderBack,
    PanelHeaderButton,
    Separator,
    SimpleCell,
    SplitCol,
    SplitLayout,
    Textarea,
    useAdaptivity,
    View,
    ViewWidth,
} from "@vkontakte/vkui";
import {
    Icon24ListAdd,
    Icon28HomeOutline,
    Icon28QuestionOutline,
    Icon56Users3Outline,
    Icon56WifiOutline
} from "@vkontakte/icons"

import "@vkontakte/vkui/dist/vkui.css";
import "./App.css"
import OnBoardPanel from "./panels/OnBoardPanel";
import bridge from "@vkontakte/vk-bridge";
import locations from "./locations";
import LocationCard from "./components/LocationCard";
import io from "socket.io-client";

const App = () => {
    const {viewWidth} = useAdaptivity();
    const [activePanel, setActivePanel] = useState("main")
    const [activeModal, setActiveModal] = useState("")
    const [userLocations, setUserLocations] = useState([])
    const [tempUserLocations, setTempUserLocations] = useState("")
    const [playersCount, setPlayersCount] = useState(3)
    const [activePlayerIndex, setActivePlayerIndex] = useState(0)
    const [offlinePlayersList, setOfflinePlayersList] = useState([])
    const [isRoleShow, setIsRoleShow] = useState(false)
    const [offlineLocation, setOfflineLocation] = useState("")
    const [allPlayersShown, setAllPlayersShown] = useState(false)
    const [startPlayerHeight, setStartPlayerHeight] = useState("100px")
    const [countDownSeconds, setCountDownSeconds] = useState(0)
    const [startsPlayerName, setStartsPlayerName] = useState("")
    const [countDownInterval, setCountDownInterval] = useState(null)
    const [countDownTimer, setCountDownTimer] = useState(null)
    const [flashLightTimer, setFlashLightTimer] = useState(null)
    const [socket, setSocket] = useState(null)
    const [user, setUser] = useState({first_name: "test"})
    const [onlineGame, setOnlineGame] = useState({})
    const [onlineGameRoom, setOnlineGameRoom] = useState({})
    const [roomError, setRoomError] = useState(false)
    const [role, setRole] = useState(false)
    const roomNumber = useRef(null)


    const goTo = (panelName) => {
        setActivePanel(panelName)
    }

    useEffect(() => {
        const socket = io("https://vkma.vcode.flint3s.online", {forceNew: true})

        setSocket(socket)

        socket.on("connection", (msg) => {
            console.log("Connected to socket io")
        })

        socket.on("goto online", () => {
            setActivePanel("online")
        })

        socket.on("room connected", ({room, roomInfo}) => {
            setOnlineGameRoom(room)
            setOnlineGame(roomInfo)
            setActivePanel("wait_online")
        })

        socket.on("room not found", () => {
            setRoomError(true)
        })

        socket.on("update game", ({roomInfo}) => {
            setOnlineGame(roomInfo)
        })

        socket.on("set role", (role) => {
            setRole(role)
        })

        socket.on("game started", ({location, timer, playersCount}) => {
            console.log("game started", location, timer)
            setOfflineLocation(location)
            setCountDownSeconds(timer / 1000)

            const countDownIntervalId = setInterval(() => {
                setCountDownSeconds(prev => prev - 1)
            }, 1000)

            if (onlineGame?.players) {
                setTimeout(() => {
                    flashLight()
                }, timer - 10000)
            }

            setCountDownInterval(countDownIntervalId)
            setActivePanel("online_play")
        })

        socket.on("game end", (playersData) => {
            clearInterval(countDownInterval)

            setOnlineGame(playersData)
            setActivePanel("online_results")
        })

        socket.on("disconnect", () => {
            console.log("disconnected!")
        })

        bridge.send("VKWebAppGetUserInfo").then(r => {
            setUser(r)
        })

        bridge.send("VKWebAppStorageGet", {keys: ["onboarded"]}).then(r => {
            if (!r.keys[0].value) {
                bridge.send("VKWebAppStorageSet", {
                    key: "onboarded",
                    value: "true"
                })
                goTo("onboard")
            }
        })
    }, [])

    useEffect(() => {
        setOfflinePlayersList(Array(playersCount).fill(0).map((pl, i) => ({name: "Игрок " + (i + 1)})))
    }, [playersCount])

    const addUserLocations = () => {
        setUserLocations(tempUserLocations.split(",").map(l => l.trim()).filter(l => l.length))
        setActiveModal("")
    }

    const getSpyCount = (playersCount) => {
        if (playersCount < 7) return 1
        if (playersCount < 14) return 2
        if (playersCount < 21) return 3
        return Math.floor(playersCount / 7)
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

    const startOfflineGame = () => {
        const spyCount = getSpyCount(playersCount)
        const playerRoleList = shuffle([...Array(playersCount - spyCount).fill(false), ...Array(spyCount).fill(true)])
        setAllPlayersShown(false)
        setActivePlayerIndex(0)

        setOfflinePlayersList(prev => {
            return prev.map((pl, i) => {
                return {...pl, spy: playerRoleList[i]}
            })
        })

        setOfflineLocation(shuffle([...locations, ...userLocations])[0])

        setActiveModal("")
        setActivePanel("offline")
    }

    const flashLight = () => {
        const flashIntervalId = setInterval(() => {
            bridge.send("VKWebAppFlashGetInfo").then(r => {
                console.log("flash", r)
                if (parseInt(r?.level) === 0) {
                    bridge.send("VKWebAppFlashSetLevel", {"level": 1})
                } else {
                    bridge.send("VKWebAppFlashSetLevel", {"level": 0})
                }
            })
        }, 1000)

        setTimeout(() => {
            clearInterval(flashIntervalId)
        }, 8000)
    }

    const onClickPlayCard = () => {
        if (isRoleShow) {
            setActivePlayerIndex(prev => prev + 1)
            setIsRoleShow(false)

            if (activePlayerIndex === playersCount - 1) {
                setAllPlayersShown(true)
                setCountDownSeconds(playersCount * 60)
                setStartsPlayerName(shuffle(offlinePlayersList.slice())[0]?.name || "Игрок " + activePlayerIndex)

                const countDownIntervalId = setInterval(() => {
                    setCountDownSeconds(prev => prev - 1)
                }, 1000)
                const countDownTimerId = setTimeout(() => {
                    stopGame()
                }, (playersCount * 60) * 1000)

                const flashLightTimerId = setTimeout(() => {
                    flashLight()
                }, (playersCount * 60 - 10) * 1000)

                setCountDownInterval(countDownIntervalId)
                setCountDownTimer(countDownTimerId)
                setFlashLightTimer(flashLightTimerId)

                setTimeout(() => {
                    setStartPlayerHeight("0px")
                }, 3000)
            }
        } else {
            setIsRoleShow(true)
        }
    }
    const pad = (n, width, z) => {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }

    const stopGame = () => {
        setActivePanel("offline-results")
        clearInterval(countDownInterval)
        clearTimeout(countDownTimer)
        clearTimeout(flashLightTimer)
        console.log("stopGame")
    }

    const connectToRoom = () => {
        socket.emit("connect room", {room: roomNumber.current.value, user})
    }

    const modal = (
        <ModalRoot activeModal={activeModal}>
            <ModalCard id="add-locations" onClose={() => setActiveModal("")}>
                <FormItem top="Добавить локации">
                    <Textarea
                        onInput={(e) => {
                            setTempUserLocations(e.currentTarget.value)
                        }}
                        value={tempUserLocations}
                        placeholder="Аэропорт, тёмный лес, квартира Филипа"/>
                </FormItem>
                <Caption className="text-center mb-4">
                    Введите название локаций через запятую
                </Caption>
                <Button size="l" onClick={addUserLocations}>
                    Сохранить
                </Button>
            </ModalCard>
            <ModalCard id="players-count" onClose={() => setActiveModal("")}>
                <FormItem top="Количество игроков">
                    <Input
                        onInput={(e) => {
                            if (e.currentTarget.value === "") {
                                setPlayersCount(0)
                            }

                            if (!isNaN(parseInt(e.currentTarget.value))) {
                                setPlayersCount(parseInt(e.currentTarget.value))
                            }
                        }}
                        value={playersCount}
                    />
                </FormItem>
                <Caption className="text-center mb-2">
                    Введи количество игроков (от 3 до ∞)
                </Caption>

                {
                    playersCount >= 3 &&
                    <div style={{maxHeight: "50vh", overflow: "scroll"}}>
                        <FormItem top="Имена игроков">
                            {
                                Array(parseInt(playersCount)).fill(0).map((_, i) => {
                                    return (
                                        <Input
                                            className="mb-1"
                                            value={offlinePlayersList[i]?.name}
                                            onInput={(e) => {
                                                setOfflinePlayersList((prev) => {
                                                    return [
                                                        ...prev.slice(0, i),
                                                        {name: e.currentTarget.value},
                                                        ...prev.slice(i + 1),
                                                    ]
                                                })
                                            }}/>
                                    )
                                })
                            }
                        </FormItem>
                    </div>
                }

                <Button size="l" onClick={() => {
                    startOfflineGame()
                }} disabled={parseInt(playersCount) < 3}>
                    Начать игру!
                </Button>
            </ModalCard>
        </ModalRoot>
    )

    return (
        <AppRoot>
            <SplitLayout header={<PanelHeader separator={false}/>} modal={modal}>
                <SplitCol spaced={viewWidth && viewWidth > ViewWidth.MOBILE}>
                    <View activePanel={activePanel}>
                        <OnBoardPanel id="onboard" goTo={goTo}/>
                        <Panel id="main">
                            <PanelHeader left={
                                <PanelHeaderButton onClick={() => goTo("onboard")}>
                                    <Icon28QuestionOutline/>
                                </PanelHeaderButton>
                            }>
                                Кто шпион?
                            </PanelHeader>

                            <Div className="d-block d-md-flex justify-content-around">
                                <div>
                                    <Headline className="text-center mb-2" weight="semibold">
                                        Уже собрались с друзьями? Давайте играть оффлайн!
                                    </Headline>
                                    <Button
                                        size="l"
                                        className="text-center"
                                        stretched
                                        before={<Icon56Users3Outline width="32"/>}
                                        onClick={() => setActiveModal("players-count")}
                                    >
                                        Играть оффлайн
                                    </Button>
                                </div>
                                <div>
                                    <Headline weight="semibold" className="text-center mt-4 mt-md-0 mb-2">
                                        Никто не пришён на встречу? Не беда - играем онлайн!
                                    </Headline>
                                    <Button
                                        size="l"
                                        className="text-center"
                                        stretched
                                        onClick={() => socket.emit("start online", user)}
                                        before={<Icon56WifiOutline width="32"/>}
                                    >

                                        Играть онлайн
                                    </Button>
                                </div>
                            </Div>

                            <Div className="text-center">
                                <Headline weight="semibold" className="mb-3">
                                    Доступные локации
                                </Headline>

                                <Card mode="shadow" onClick={() => {
                                    setActiveModal("add-locations");
                                    setTempUserLocations(userLocations.join(", "))
                                }}
                                      className="text-center mb-3 p-3"
                                      style={{color: "white", background: "var(--button_primary_background)"}}>
                                    <Icon24ListAdd className="mx-auto"/> Добавить свои локации
                                </Card>
                                <div className="d-flex flex-wrap justify-content-around">
                                    {
                                        userLocations.length >= 1 && (typeof userLocations) === "object" &&
                                        userLocations.map(l => {
                                            return (
                                                <LocationCard onClick={() => {
                                                    setActiveModal("add-locations");
                                                    setTempUserLocations(userLocations.join(", "))
                                                }} name={l} added/>
                                            )
                                        })
                                    }
                                </div>
                                <div className="d-flex flex-wrap justify-content-around">
                                    {
                                        locations.map(l => {
                                            return (
                                                <LocationCard name={l}/>
                                            )
                                        })
                                    }
                                </div>
                            </Div>

                            <Div className="text-center">
                                Сделано с <span style={{color: "#ff5e75"}}>♥</span> командой <a
                                href="https://vk.com/ftitdev" style={{color: "black"}} target="_blank">FTIT</a> для
                                Вездекода-2022
                            </Div>
                        </Panel>
                        <Panel id="offline">
                            <PanelHeader left={<PanelHeaderButton/>}>Оффлайн игра</PanelHeader>
                            <Div>
                                <Card className="text-center mb-4" mode="shadow">
                                    <Div>
                                        Передавайте устройство по кругу и узнавайте свою роль! Но делайте это так, чтобы
                                        соседние игроки не видели.
                                    </Div>
                                </Card>
                            </Div>

                            {
                                allPlayersShown ?
                                    <>
                                        <Div>
                                            <Card
                                                className="text-center"
                                                mode="shadow"
                                                style={{height: "50vh"}}
                                            >
                                                <Div>
                                                    <Headline
                                                        weight="semibold"
                                                        className="mb-4"
                                                        style={{
                                                            fontSize: "20px",
                                                            height: startPlayerHeight,
                                                            transition: "all .3s ease",
                                                            overflow: "hidden"
                                                        }}
                                                    >
                                                        {startsPlayerName} начинает
                                                        игру! <br/>Задай первый вопрос любому игроку!
                                                    </Headline>

                                                    <h1 className="countdown mb-0">
                                                        {pad(Math.floor(countDownSeconds / 60), 2)}:{pad(countDownSeconds - Math.floor(countDownSeconds / 60) * 60, 2)}
                                                    </h1>
                                                    <span>До конца игры</span>
                                                </Div>
                                            </Card>
                                        </Div>

                                        <FixedLayout vertical="bottom">
                                            <Div>
                                                <Button stretched size="l" onClick={stopGame}>
                                                    Закончить игру
                                                </Button>
                                            </Div>
                                        </FixedLayout>
                                    </>
                                    :
                                    <Div>
                                        <Card
                                            className="text-center"
                                            mode="shadow"
                                            style={{height: "50vh"}}
                                            onClick={onClickPlayCard}
                                        >
                                            <Div>
                                                <Headline weight="semibold" className="mb-4"
                                                          style={{fontSize: "20px"}}>
                                                    {offlinePlayersList[activePlayerIndex]?.name || "Игрок " + activePlayerIndex}
                                                </Headline>

                                                <>
                                                    {
                                                        isRoleShow ?
                                                            <>
                                                                {
                                                                    offlinePlayersList[activePlayerIndex]?.spy ?
                                                                        <div>
                                                                            <h1>Ты - шпион!</h1>
                                                                            <span>Задавай остальным наводящие вопросы, чтобы узнать локацию!</span>
                                                                        </div>
                                                                        :
                                                                        <div>
                                                                            <h1>Ты - мирный житель!</h1>
                                                                            <h3 className="mt-1"
                                                                                style={{color: "var(--button_primary_background)"}}>Локация
                                                                                - {offlineLocation}</h3>
                                                                            <span>Задавай остальным вопросы, чтобы выявить шпиона!</span>
                                                                        </div>
                                                                }
                                                                <div className="mt-5">
                                                                    Нажми ещё раз, чтобы скрыть свою роль и передай
                                                                    устройство следующему игроку
                                                                </div>
                                                            </>
                                                            :
                                                            <div className="tap-to-show" style={{fontSize: "24px"}}>
                                                                Нажми, чтобы узнать свою роль
                                                            </div>
                                                    }
                                                </>
                                            </Div>
                                        </Card>
                                    </Div>

                            }
                        </Panel>
                        <Panel id="offline-results">
                            <PanelHeader left={<PanelHeaderButton
                                onClick={() => setActivePanel("main")}><Icon28HomeOutline/></PanelHeaderButton>}>Результаты
                                игры</PanelHeader>

                            <Div className="text-center">
                                <Card mode="shadow">
                                    <Div>
                                        <Headline weight="semibold" style={{fontSize: "24px"}}>Игра окончена!</Headline>

                                        <h3>Локация - {offlineLocation}</h3>

                                        <FormItem top="Игроки">
                                            {
                                                offlinePlayersList.map(pl => {
                                                    return (
                                                        <>
                                                            <SimpleCell
                                                                disabled
                                                                after={<>
                                                                    {pl?.spy ? "Шпион" : "Мирный"}
                                                                </>}
                                                            >
                                                                {pl?.name}
                                                            </SimpleCell>
                                                            <Separator/>
                                                        </>
                                                    )
                                                })
                                            }
                                        </FormItem>
                                    </Div>
                                </Card>

                                <Button size="l" stretched className="mt-4" onClick={() => setActivePanel("main")}>На
                                    главную</Button>
                            </Div>
                        </Panel>
                        <Panel id="online">
                            <PanelHeader left={<PanelHeaderBack onClick={() => setActivePanel("main")}/>}>Онлайн
                                игра</PanelHeader>

                            <Div>
                                <Card className="text-center mb-3" mode="shadow">
                                    <Div>
                                        <Headline weight="semibold">Играйте онлайн!</Headline>

                                        Подключайтесь к комнате друга или создавайте свою и приглашайте друзей!
                                    </Div>
                                </Card>

                                <Card mode="shadow" className="mb-2">
                                    <FormItem top="Номер комнаты">
                                        <Input placeholder="123123" getRef={roomNumber}/>
                                        <div className="text-center">
                                            {roomError && "Ошибка подключения! Комнаты нет или игра уже началась!"}
                                        </div>
                                    </FormItem>
                                    <Div>
                                        <Button size="l" stretched onClick={connectToRoom}>
                                            Подключиться
                                        </Button>
                                    </Div>
                                </Card>

                                <Card mode="shadow" className="text-center">
                                    <Div>
                                        <Headline weight="semibold" className="mb-2">
                                            Создать свою комнату
                                        </Headline>

                                        <Button size="l" stretched onClick={() => socket.emit("create room", user)}>
                                            Создать
                                        </Button>
                                    </Div>
                                </Card>
                            </Div>
                        </Panel>
                        <Panel id="wait_online">
                            <PanelHeader
                                left={<PanelHeaderBack onClick={() => {
                                    setActivePanel("online");
                                    socket.emit("leave");
                                }}/>}>Комната</PanelHeader>

                            <Div>
                                <Card mode="shadow" className="text-center">
                                    <Div>
                                        <Headline weight="semibold" className="mb-4" style={{fontSize: "24px"}}>Комната
                                            #{onlineGameRoom}</Headline>
                                        <Button stretched mode="secondary"
                                                onClick={() => navigator.clipboard.writeText(onlineGameRoom + "")}>Скопировать
                                            номер комнаты</Button>
                                        <Button size="l" className="mt-2" stretched
                                                onClick={() => bridge.send("VKWebAppShare")}>Пригласить друзей</Button>
                                    </Div>
                                </Card>

                                <Card mode="shadow" className="text-center">
                                    <Div>
                                        <Group header={<Header>Игроки в комнате</Header>}>
                                            {
                                                onlineGame?.players?.map(player => {
                                                    return (
                                                        <SimpleCell before={<Avatar src={player?.photo_100}/>}>
                                                            {player?.first_name}
                                                        </SimpleCell>
                                                    )
                                                })
                                            }
                                        </Group>
                                    </Div>
                                </Card>
                            </Div>

                            <FixedLayout vertical="bottom">
                                <Div>
                                    <Button
                                        disabled={onlineGame?.players?.length < 3}
                                        onClick={() => socket.emit("start game", shuffle([...locations, ...userLocations])[0])}
                                        stretched size="l">Начать игру</Button>
                                </Div>
                            </FixedLayout>
                        </Panel>
                        <Panel id="online_play">
                            <PanelHeader>Играем!</PanelHeader>

                            <Div>
                                <Card mode="shadow" className="text-center">
                                    <Div>

                                        {
                                            role ?
                                                <>
                                                    <Headline weight="semibold" style={{fontSize: "24px"}}>Ты -
                                                        Шпион!</Headline>
                                                    <div className="mt-3">
                                                        Выясни, что за локация была загадана и не выдавай того, что ты
                                                        шпион!
                                                    </div>
                                                </>
                                                :
                                                <>
                                                    <Headline weight="semibold" style={{fontSize: "24px"}}>Ты -
                                                        Мирный!</Headline>
                                                    <h3>Локация - {offlineLocation}</h3>

                                                    <div className="mt-3">
                                                        Выясни, что за локация была загадана и не выдавай того, что ты
                                                        шпион!
                                                    </div>
                                                </>
                                        }

                                        <h1 className="countdown mb-0 mt-5">
                                            {pad(Math.floor(countDownSeconds / 60), 2)}:{pad(countDownSeconds - Math.floor(countDownSeconds / 60) * 60, 2)}
                                        </h1>
                                        <span className="mb-5">До конца игры</span>
                                    </Div>
                                </Card>
                            </Div>
                        </Panel>
                        <Panel id="online_results">
                            <PanelHeader left={<PanelHeaderButton
                                onClick={() => setActivePanel("main")}><Icon28HomeOutline/></PanelHeaderButton>}>Результаты
                                игры</PanelHeader>

                            <Div className="text-center">
                                <Card mode="shadow">
                                    <Div>
                                        <Headline weight="semibold" style={{fontSize: "24px"}}>Игра окончена!</Headline>

                                        <h3>Локация - {offlineLocation}</h3>

                                        <FormItem top="Игроки">
                                            {
                                                onlineGame?.players?.map(pl => {
                                                    return (
                                                        <>
                                                            <SimpleCell
                                                                disabled
                                                                after={<>
                                                                    {pl?.role ? "Шпион" : "Мирный"}
                                                                </>}
                                                            >
                                                                {pl?.first_name}
                                                            </SimpleCell>
                                                            <Separator/>
                                                        </>
                                                    )
                                                })
                                            }
                                        </FormItem>
                                    </Div>
                                </Card>

                                <Button size="l" stretched className="mt-4" onClick={() => {
                                    setActivePanel("main");
                                    socket.emit("leave");
                                }
                                }>На
                                    главную</Button>
                            </Div>
                        </Panel>
                    </View>
                </SplitCol>
            </SplitLayout>
        </AppRoot>
    );
};

export default App;
