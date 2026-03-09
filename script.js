const transactions = [];
let chart;
let monthsToSimulate = 1;

Chart.defaults.animations.duration = 800;
Chart.defaults.animations.easing = 'easeOutQuart';

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function updateAll() {
    saveData();
    updateTransactionList();
    updateChart();
}

//Function to Parse Transaction Info and Insert
document.getElementById('transaction-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const day = parseInt(document.getElementById('day').value);
    const type = document.getElementById('type').value;
    const recurrence = document.getElementById('recurrence').value;

    if (day < 1 || day > 30) {
        alert('Day must be between 1 and 30!');
        return;
    }

    if (description && !isNaN(amount) && !isNaN(day)) {
        transactions.push({ description, amount, day, type, recurrence });
        saveData();
        updateTransactionList();
        updateChart();
        this.reset();
    }
});

//Starting balance listener
document.getElementById('startingBalance').addEventListener('input', updateAll);

//Sort Transactions and Update List
function updateTransactionList() {
    const transactionList = document.getElementById('transaction-cards');
    transactionList.innerHTML = '';

    const sortedTransactions = [...transactions].sort((a, b) => a.day - b.day);

    sortedTransactions.forEach(txn => {
        const card = document.createElement('div');
        card.classList.add('transaction-card');

        card.innerHTML = `
            <div class="txn-left">
                <strong>${txn.description}</strong>
                <div>Day ${txn.day} • ${capitalize(txn.recurrence)}</div>
            </div>

            <div class="txn-right">
                ${txn.type === 'expense' ? '-' : '+'}$${txn.amount.toFixed(2)}
            </div>
        `;

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';

        editBtn.onclick = () => {
            document.getElementById('description').value = txn.description;
            document.getElementById('amount').value = txn.amount;
            document.getElementById('day').value = txn.day;
            document.getElementById('type').value = txn.type;
            document.getElementById('recurrence').value = txn.recurrence;

            transactions.splice(transactions.indexOf(txn), 1);

            saveData();
            updateTransactionList();
            updateChart();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';

        deleteBtn.onclick = () => {
            transactions.splice(transactions.indexOf(txn), 1);
            saveData();
            updateTransactionList();
            updateChart();
        }
        
        card.classList.add(txn.type);

        const btnContainer = document.createElement('div');
        btnContainer.classList.add('txn-buttons');
        btnContainer.appendChild(editBtn);
        btnContainer.appendChild(deleteBtn);
        card.appendChild(btnContainer);

        transactionList.appendChild(card);
    });
}

//Find balances per day and set min/max of chart, plot balances
function updateChart() {
    const dailyBalances = getDailyBalances();
    const labels = dailyBalances.map(b => `${b.day}`);
    const data = dailyBalances.map(b => b.balance);

    const isDark = document.body.classList.contains('dark-mode');

    const textColor = isDark ? '#eee' : '#222';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    //Lowest Point Info
    const lowestPoint = dailyBalances.reduce((min, point) =>
        point.balance < min.balance ? point: min);
    document.getElementById('lowest-balance').textContent = `$${lowestPoint.balance.toFixed(2)}`;
    document.getElementById('lowest-date').textContent = `Day ${lowestPoint.day}`;

    //Set Chart Min/Max with 10% Padding
    let minBalance = Math.min(...data);
    let maxBalance = Math.max(...data);

    const range = maxBalance - minBalance || 1;
    const padding = range * 0.1;

    minBalance -= padding;
    maxBalance += padding;

    if (minBalance > 0) minBalance = 0;

    //Get Context and Plot
    const ctx = document.getElementById('balance-chart').getContext('2d');

    if (!chart) {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Balance',
                    data: data,
                    borderColor: 'green',
                    backgroundColor: 'rgba(0, 255, 0, 0.2)',

                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 3,

                    segment: {
                        borderColor: ctx => {
                            const y0 = ctx.p0.parsed.y;
                            const y1 = ctx.p1.parsed.y;
                            return (y0 < 0 || y1 < 0) ? 'red' : 'green';
                        },
                        backgroundColor: ctx => {
                            const y0 = ctx.p0.parsed.y;
                            const y1 = ctx.p1.parsed.y;
                            return (y0 < 0 || y1 < 0)
                                ? 'rgba(255, 0, 0, 0.2)'
                                : 'rgba(0, 255, 0, 0.2)';
                        }
                    },

                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                animation: {
                    duration: 700,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    annotation: {
                        annotations: {
                            zeroLine: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: '#e5f365',
                                borderWidth: 2,
                                shadowBlur: 15,
                                shadowColor: '#e5f365',
                                drawTime: 'beforeDatasetsDraw'
                            }
                        }
                    },
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        callbacks: {
                            label: context => "$" + context.raw.toFixed(2)
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Day', color: textColor },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        title: { display: true, text: 'Balance ($)', color: textColor },
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                        min: minBalance,
                        max: maxBalance
                    }
                }
            }
        });
    } else {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;

        chart.options.scales.y.min = minBalance;
        chart.options.scales.y.max = maxBalance;

        chart.options.scales.x.title.color = textColor;
        chart.options.scales.y.title.color = textColor;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.ticks.color = textColor;

        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.grid.color = gridColor;

        chart.options.plugins.legend.labels.color = textColor;

        chart.update();
    }

    //Update summary info
    const startBalance = data[0];
    const endBalance = data[data.length - 1];

    const trendElement = document.getElementById('trend-warning');

    if (endBalance < startBalance) {
        trendElement.textContent = '⚠ Warning: Downward Trend Detected!';
        trendElement.style.color = 'red';
    } else {
        trendElement.textContent = '✅ Your balance trends upward.';
        trendElement.style.color = 'green';
    }

    document.getElementById('projected-balance').textContent = `$${data[data.length - 1].toFixed(2)}`;

    let totalIncome = 0;
    let totalExpenses = 0;
    for (let d = 1; d <= monthsToSimulate * 30; d++) {
        transactions.forEach(txn => {
            let occurs = false;
            if (txn.recurrence === "none" && d === txn.day)
                occurs = true;
            else if (txn.recurrence === "weekly" && d >= txn.day && (d - txn.day) % 7 === 0)
                occurs = true;
            else if (txn.recurrence === "biweekly" && d >= txn.day && (d - txn.day) % 14 === 0)
                occurs = true;
            else if (txn.recurrence === "monthly" && d >= txn.day && (d - txn.day) % 30 === 0)
                occurs = true;
            if (occurs) {
                if (txn.type === "income")
                    totalIncome += txn.amount;
                else
                    totalExpenses += txn.amount;
            }
        });
    }
    document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
}

//Simulate Month and Get Balances per Day
function getDailyBalances() {
    const daysPerMonth = 30;
    const totalDays = daysPerMonth * monthsToSimulate;

    const balances = [];
    let currentBalance = 
        document.getElementById('startingBalance').value
        ? parseFloat(document.getElementById('startingBalance').value)
        : 0;

    for (let d = 1; d <= totalDays; d++) {

        transactions.forEach(txn => {

            if (txn.recurrence === "none" && d === txn.day) {
                currentBalance += txn.type === 'expense' ? -txn.amount : txn.amount;
            }

            else if (txn.recurrence === "weekly" && d >= txn.day && (d - txn.day) % 7 === 0) {
                currentBalance += txn.type === 'expense' ? -txn.amount : txn.amount;
            }

            else if (txn.recurrence === "biweekly" && d >= txn.day && (d - txn.day) % 14 === 0) {
                currentBalance += txn.type === 'expense' ? -txn.amount : txn.amount;
            }

            else if (txn.recurrence === "monthly" && d >= txn.day && (d - txn.day) % daysPerMonth === 0) {
                currentBalance += txn.type === 'expense' ? -txn.amount : txn.amount;
            }
        });
        balances.push({ day: d, balance: currentBalance });
    }

    return balances;
}

//Save data
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('startingBalance', document.getElementById('startingBalance').value);
}

//Load data
function loadData() {
    const savedTransactions = localStorage.getItem('transactions');
    const savedStartingBalance = localStorage.getItem('startingBalance');

    if (savedTransactions) {
        transactions.push(...JSON.parse(savedTransactions));
    }
    if (savedStartingBalance) {
        document.getElementById('startingBalance').value = savedStartingBalance;
    }

    updateTransactionList();
    updateChart();
}

//Extrapolate to next month
function extrapolateTo() {
    const monthsInput = document.getElementById('extrapolateMonths');
    const monthsToAdd = parseInt(monthsInput.value) || 1;
    monthsToSimulate += monthsToAdd;
    updateChart();
}

//Download image of chart
function downloadImage() {
    if (transactions.length === 0) {
        alert('No data on plot!');
        return;
    }

    const canvas = document.getElementById('balance-chart');

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balance_chart.png';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

//Download CSV
function downloadCSV() {
    const dailyBalances = getDailyBalances();
    if (transactions.length === 0) {
        alert('No data to download!');
        return;
    }

    //CSV Header
    let csv = "day,balance\n";

    //Add rows
    dailyBalances.forEach(point => {
        csv += `${point.day},${point.balance}\n`;
    });

    //Create File Blob
    const blob = new Blob([csv], {type: "text/csv"});

    //Create Temp Download Link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_balances.csv';

    //Download and Cleanup
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

//Clear Data
function clearData() {
    if (confirm('Are you sure you want to clear all data?')) {
        transactions.length = 0;
        document.getElementById('startingBalance').value = '';
        localStorage.removeItem('transactions');
        localStorage.removeItem('startingBalance');
        updateTransactionList();
        updateChart();
    }
}

const toggle = document.getElementById('dark-toggle');

function updateDarkButton() {
    const btn = document.getElementById("dark-toggle");

    if (document.body.classList.contains("dark-mode"))
        btn.textContent = "☀ Light Mode";
    else
        btn.textContent = "🌙 Dark Mode";
}

toggle.onclick = () => {
    document.body.classList.toggle('dark-mode');

    const isDark = document.body.classList.contains('dark-mode');
    updateDarkButton();

    localStorage.setItem("darkMode", isDark);

    updateChart();
}

if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add('dark-mode');
}

updateDarkButton();
loadData();