export function getCurrentDateTime() {
    const viennaDate = new Date().toLocaleString('de-DE', {
        timeZone: 'Europe/Vienna'
    });
    const date = new Date(viennaDate);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getDate()}.${date.getMonth() + 1}. ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
