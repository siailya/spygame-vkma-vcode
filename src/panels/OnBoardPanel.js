import {Button, Div, FixedLayout, Gallery, Panel, PanelHeader, PanelHeaderBack} from "@vkontakte/vkui";
import OnBoardSlide from "../components/onBoardSlide";
import hello from "../assets/hello.png";
import find from "../assets/find.png";
import glass from "../assets/glass.png";
import repeat from "../assets/repeat.png";

import {useState} from "react";

const OnBoardPanel = ({id, goTo}) => {
    const [slide, setSlide] = useState(0)

    return (
        <Panel id={id}>
            <PanelHeader left={<PanelHeaderBack onClick={() => goTo("main")}/>}>
                Как играть?
            </PanelHeader>
            <Div>
                <Gallery
                    slideWidth="100%"
                    slideIndex={slide}
                    onChange={setSlide}
                >
                    <OnBoardSlide
                        header="Привет!"
                        className="hello-slide"
                        caption="Добро пожаловать в игру «Шпион»! Это веселая игра для компаний, так что собирай друзей и давай начинать!"
                        picture={hello}
                    />
                    <OnBoardSlide
                        header="Мирные и шпион"
                        className="hello-slide"
                        caption="Суть игры предельно проста - есть «мирные» жители и «шпион». Мирным известно, в какой локации они находятся, а шпиону - нет"
                        picture={find}
                    />
                    <OnBoardSlide
                        header="Процесс игры"
                        className="hello-slide"
                        caption="Задача мирных - выяснить, кто шпион. А задача шпиона - выяснить, что за локация была загадана"
                        picture={glass}
                    />
                    <OnBoardSlide
                        header="Начнём?"
                        className="hello-slide"
                        caption="Все по кругу задают вопросы другому игроку таким образом, чтобы шпион не понял, что за локация загадана. А шпион пытается из этих вопросов понять локацию"
                        picture={repeat}
                    />
                </Gallery>
            </Div>
            <FixedLayout vertical="bottom">
                <Div>
                    <Button
                        stretched
                        size="l"
                        onClick={slide === 3 ? () => goTo("main") : () => setSlide(prev => prev + 1)}
                    >
                        {
                            slide === 3 ? "Начинаем!" : "Дальше!"
                        }
                    </Button>
                </Div>
            </FixedLayout>
        </Panel>
    )
}

export default OnBoardPanel;
