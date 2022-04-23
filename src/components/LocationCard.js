import {Caption, Card, Div} from "@vkontakte/vkui";

const LocationCard = ({name, added = false, onClick = () => {}}) => {

    return (
        <Card mode="shadow" className="mb-2" onClick={onClick} style={{width: "45%"}}>
            <Div style={{padding: "10px"}}>
                {name}

                {added &&
                    <Caption>
                        Пользовательская локация
                    </Caption>
                }
            </Div>
        </Card>
    )
}

export default LocationCard;
