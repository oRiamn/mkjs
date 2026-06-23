export function getRandomInt(parammin: number, parammax: number) {
    const min = Math.ceil(parammin);
    const max = Math.floor(parammax);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}