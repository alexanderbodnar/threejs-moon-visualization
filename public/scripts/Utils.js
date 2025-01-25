

// Function to log messages to the on-screen log
export function logMessage(message) {
    const logger = document.getElementById("log");
    const logEntry = document.createElement("div");
    logEntry.textContent = message;
    logEntry.classList.add("log-entry");
    logger.appendChild(logEntry);
    setTimeout(() => {
        logEntry.remove();
    }, 3500);
    if (logger.childElementCount > 10)
        logger.firstChild.remove();
}