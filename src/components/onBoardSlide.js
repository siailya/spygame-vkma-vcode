const onBoardSlide = ({header, picture, caption, className}) => {
    return (
        <div className={className + " text-center gallery-slide"}>
            <h1 className="text-center">{header}</h1>

            <img src={picture} width="60%" alt="hello"/>

            <div className="caption">
                {caption}
            </div>
        </div>
    )
}

export default onBoardSlide;
