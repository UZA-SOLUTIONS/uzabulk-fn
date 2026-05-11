export default function SlideImage({ link }) {
    return (
        <div>
            <div
                className="character-img"
                style={{
                    backgroundColor: "#f5f5f5",
                    borderRadius: "15px",
                }}
            >
                <img
                    src={link}
                    alt=""
                    className="img-fluid"
                    style={{
                        height: "100%",
                        width: "100%",
                        objectFit: "contain",
                        maxHeight: "370px",
                    }}
                />
            </div>
        </div>
    )
}