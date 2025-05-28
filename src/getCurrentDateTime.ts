export function getCurrentDateTime() {
    return new Date().toLocaleString('de-DE', { timeZone: 'Europe/Vienna' }).replace(/:\d\d$/,'');
}