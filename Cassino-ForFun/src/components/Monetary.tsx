interface IMonetaryProps {
    value: number;
    showFraction?: boolean;
    raw?: boolean;
}

const Monetary: React.FC<IMonetaryProps> = ({ value, showFraction = false, raw = false }) => {
    if (raw) {
        return (
            <span>
                {new Intl.NumberFormat("pt-BR", {
                    useGrouping: true,
                    minimumFractionDigits: showFraction ? 2 : 0,
                    maximumFractionDigits: showFraction ? 2 : 2,
                }).format(value)}
            </span>
        );
    }

    const formattedValue = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        useGrouping: true,
        minimumFractionDigits: showFraction ? 2 : 0,
        maximumFractionDigits: showFraction ? 2 : 0,
    })
        .format(value);

    return (
        <span>
            {formattedValue}
        </span>
    )
};

export default Monetary;
