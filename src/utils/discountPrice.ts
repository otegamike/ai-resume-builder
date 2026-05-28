export function discountPrice (price: number, discount: number ) : number {
    const saved =  price * (discount / 100)
    return Math.floor(price - saved)
}