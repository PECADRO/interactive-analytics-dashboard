/**
 * Interactive Analytics Dashboard
 * Chart.js Implementation with real-time data simulation
 */

// ============================================
// Configuration & State
// ============================================
const Dashboard = {
    charts: {},
    currentTheme: 'light',
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    editingTransactionId: null,
    transactions: [],
    revenueData: null,
    userGrowthData: null
};

const STORAGE_KEY = 'interactive-analytics-dashboard-transactions-v1';

// Color palettes for charts
const Colors = {
    primary: ['#4c6ef5', '#5c7cfa', '#748ffc', '#91a7ff', '#bac8ff'],
    secondary: ['#845ef7', '#9775fa', '#b197fc', '#d0bfff', '#e5dbff'],
    success: ['#51cf66', '#69db7c', '#8ce99a', '#b2f2bb', '#d3f9d8'],
    warning: ['#fcc419', '#ffd43b', '#ffe066', '#ffec99', '#fff3bf'],
    danger: ['#ff6b6b', '#ff8787', '#ffa8a8', '#ffc9c9', '#ffe3e3'],
    chartColors: {
        blue: '#4c6ef5',
        purple: '#845ef7',
        green: '#51cf66',
        yellow: '#fcc419',
        red: '#ff6b6b',
        teal: '#20c997',
        orange: '#ff922b',
        pink: '#f06595'
    }
};

// ============================================
// Utility Functions
// ============================================
function getCSSVariable(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function generateDates(days) {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

function randomData(count, min, max) {
    return Array.from({ length: count }, () => 
        Math.floor(Math.random() * (max - min + 1)) + min
    );
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function normalizeTransaction(transaction) {
    return {
        id: String(transaction.id || ''),
        customer: String(transaction.customer || '').trim(),
        product: String(transaction.product || '').trim(),
        amount: Number(transaction.amount) || 0,
        status: String(transaction.status || 'Completed'),
        date: String(transaction.date || new Date().toISOString().split('T')[0])
    };
}

function getTransactionNumber(id) {
    const match = String(id).match(/TRX-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}

function sortTransactions(transactions) {
    return [...transactions].sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) {
            return dateDiff;
        }
        return getTransactionNumber(b.id) - getTransactionNumber(a.id);
    });
}

function getNextTransactionId(transactions) {
    const maxId = transactions.reduce((max, transaction) => {
        return Math.max(max, getTransactionNumber(transaction.id));
    }, 0);

    return `TRX-${String(maxId + 1).padStart(5, '0')}`;
}

function loadTransactions() {
    try {
        const storedValue = localStorage.getItem(STORAGE_KEY);
        if (!storedValue) {
            const seededTransactions = sortTransactions(generateTransactions(50));
            saveTransactions(seededTransactions);
            return seededTransactions;
        }

        const parsedValue = JSON.parse(storedValue);
        if (!Array.isArray(parsedValue)) {
            const seededTransactions = sortTransactions(generateTransactions(50));
            saveTransactions(seededTransactions);
            return seededTransactions;
        }

        return sortTransactions(parsedValue.map(normalizeTransaction));
    } catch (error) {
        console.warn('Falling back to demo transactions:', error);
        const seededTransactions = sortTransactions(generateTransactions(50));
        saveTransactions(seededTransactions);
        return seededTransactions;
    }
}

function saveTransactions(transactions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sortTransactions(transactions.map(normalizeTransaction))));
}

function getFilteredTransactions() {
    const query = Dashboard.searchQuery.trim().toLowerCase();

    if (!query) {
        return Dashboard.transactions;
    }

    return Dashboard.transactions.filter((transaction) => {
        return [transaction.id, transaction.customer, transaction.product, transaction.status, transaction.date, transaction.amount]
            .join(' ')
            .toLowerCase()
            .includes(query);
    });
}

function updateDashboardSummary() {
    const revenue = Dashboard.transactions.reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const uniqueCustomers = new Set(Dashboard.transactions.map((transaction) => transaction.customer)).size;
    const completedOrders = Dashboard.transactions.filter((transaction) => transaction.status.toLowerCase() === 'completed').length;
    const totalOrders = Dashboard.transactions.length;
    const conversionRate = totalOrders === 0 ? 0 : (completedOrders / totalOrders) * 100;

    document.getElementById('revenue-value').textContent = formatCurrency(revenue);
    document.getElementById('users-value').textContent = uniqueCustomers.toLocaleString();
    document.getElementById('orders-value').textContent = totalOrders.toLocaleString();
    document.getElementById('conversion-value').textContent = `${conversionRate.toFixed(2)}%`;
}

function getRevenueSeries(days) {
    const labels = generateDates(days);
    const totalsByDate = new Map(labels.map((label) => [label, 0]));
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    Dashboard.transactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.date);
        if (transactionDate >= startDate && transactionDate <= today && totalsByDate.has(transaction.date)) {
            totalsByDate.set(transaction.date, totalsByDate.get(transaction.date) + Number(transaction.amount || 0));
        }
    });

    return {
        labels,
        data: labels.map((label) => totalsByDate.get(label) || 0)
    };
}

function populateTransactionForm(transaction) {
    document.getElementById('transaction-id').value = transaction ? transaction.id : '';
    document.getElementById('transaction-customer').value = transaction ? transaction.customer : '';
    document.getElementById('transaction-product').value = transaction ? transaction.product : '';
    document.getElementById('transaction-amount').value = transaction ? transaction.amount : '';
    document.getElementById('transaction-status').value = transaction ? transaction.status : 'Completed';
    document.getElementById('transaction-date').value = transaction ? transaction.date : new Date().toISOString().split('T')[0];
    document.getElementById('transaction-submit').textContent = transaction ? 'Update Transaction' : 'Add Transaction';
    document.getElementById('transaction-cancel').style.display = transaction ? 'inline-flex' : 'none';
    Dashboard.editingTransactionId = transaction ? transaction.id : null;
}

function clearTransactionForm() {
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-id').value = '';
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-status').value = 'Completed';
    document.getElementById('transaction-submit').textContent = 'Add Transaction';
    document.getElementById('transaction-cancel').style.display = 'none';
    Dashboard.editingTransactionId = null;
}

function refreshTransactionsView() {
    saveTransactions(Dashboard.transactions);
    updateDashboardSummary();
    updateRevenueChart(parseInt(document.getElementById('revenue-period').value, 10));
    renderTable();
}

function addOrUpdateTransaction(transaction) {
    const normalizedTransaction = normalizeTransaction(transaction);

    if (Dashboard.editingTransactionId) {
        Dashboard.transactions = Dashboard.transactions.map((existingTransaction) => {
            return existingTransaction.id === Dashboard.editingTransactionId
                ? { ...existingTransaction, ...normalizedTransaction, id: Dashboard.editingTransactionId }
                : existingTransaction;
        });
        showNotification('Transaction updated successfully!', 'success');
    } else {
        Dashboard.transactions = [
            ...Dashboard.transactions,
            {
                ...normalizedTransaction,
                id: getNextTransactionId(Dashboard.transactions)
            }
        ];
        showNotification('Transaction added successfully!', 'success');
    }

    Dashboard.transactions = sortTransactions(Dashboard.transactions);
    clearTransactionForm();
    refreshTransactionsView();
}

function deleteTransaction(transactionId) {
    const transaction = Dashboard.transactions.find((item) => item.id === transactionId);
    if (!transaction) {
        return;
    }

    const confirmed = window.confirm(`Delete ${transaction.customer}'s transaction for ${transaction.product}?`);
    if (!confirmed) {
        return;
    }

    Dashboard.transactions = Dashboard.transactions.filter((item) => item.id !== transactionId);

    if (Dashboard.editingTransactionId === transactionId) {
        clearTransactionForm();
    }

    showNotification('Transaction deleted.', 'success');
    refreshTransactionsView();
}

function generateTransactions(count = 50) {
    const names = ['Alice Johnson', 'Bob Smith', 'Carol White', 'David Brown', 
                   'Emma Davis', 'Frank Miller', 'Grace Wilson', 'Henry Moore',
                   'Ivy Taylor', 'Jack Anderson', 'Karen Thomas', 'Leo Jackson'];
    const products = ['Premium Plan', 'Basic Plan', 'Enterprise Plan', 'Add-on Pack',
                      'Custom Module', 'Support Package', 'Training Course', 'Consulting'];
    const statuses = ['Completed', 'Pending', 'Processing', 'Failed'];
    const weights = [0.6, 0.2, 0.15, 0.05];
    
    const transactions = [];
    for (let i = 1; i <= count; i++) {
        let status = 'Completed';
        const rand = Math.random();
        let cumulative = 0;
        for (let j = 0; j < weights.length; j++) {
            cumulative += weights[j];
            if (rand < cumulative) {
                status = statuses[j];
                break;
            }
        }
        
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        transactions.push({
            id: `TRX-${String(i).padStart(5, '0')}`,
            customer: names[Math.floor(Math.random() * names.length)],
            product: products[Math.floor(Math.random() * products.length)],
            amount: Math.floor(Math.random() * 5000) + 50,
            status: status,
            date: date.toISOString().split('T')[0]
        });
    }
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ============================================
// Chart Options Helpers
// ============================================
function getCommonOptions() {
    const textColor = getCSSVariable('--chart-text');
    const gridColor = getCSSVariable('--chart-grid');
    
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: textColor,
                    font: { size: 12, family: 'Segoe UI' },
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(45, 55, 72, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 8,
                padding: 12,
                displayColors: true,
                usePointStyle: true,
                titleFont: { size: 13, weight: '600' },
                bodyFont: { size: 12 }
            }
        },
        scales: {
            x: {
                grid: { color: gridColor, drawBorder: false },
                ticks: { color: textColor, font: { size: 11 } }
            },
            y: {
                grid: { color: gridColor, drawBorder: false },
                ticks: { color: textColor, font: { size: 11 } }
            }
        }
    };
}

// ============================================
// Chart Initializers
// ============================================
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const days = 30;
    const labels = generateDates(days);
    const data = randomData(days, 3000, 8000);
    Dashboard.revenueData = { labels, data };
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 380);
    gradient.addColorStop(0, 'rgba(76, 110, 245, 0.25)');
    gradient.addColorStop(1, 'rgba(76, 110, 245, 0.0)');
    
    Dashboard.charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: Colors.chartColors.blue,
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: Colors.chartColors.blue,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            ...getCommonOptions(),
            interaction: { intersect: false, mode: 'index' },
            scales: {
                ...getCommonOptions().scales,
                y: {
                    ...getCommonOptions().scales.y,
                    ticks: {
                        ...getCommonOptions().scales.y.ticks,
                        callback: (value) => '$' + (value / 1000).toFixed(1) + 'k'
                    }
                }
            }
        }
    });
}

function initCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    Dashboard.charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Electronics', 'Clothing', 'Food', 'Books', 'Other'],
            datasets: [{
                data: [35, 25, 20, 12, 8],
                backgroundColor: [
                    Colors.chartColors.blue,
                    Colors.chartColors.purple,
                    Colors.chartColors.green,
                    Colors.chartColors.yellow,
                    Colors.chartColors.red
                ],
                borderWidth: 2,
                borderColor: getCSSVariable('--bg-card'),
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getCSSVariable('--chart-text'),
                        font: { size: 11 },
                        padding: 16,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(45, 55, 72, 0.9)',
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: ${value}%`;
                        }
                    }
                }
            }
        }
    });
}

function initTrafficChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    
    Dashboard.charts.traffic = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Organic', 'Direct', 'Social', 'Referral', 'Email', 'Paid'],
            datasets: [{
                label: 'Visitors',
                data: [4500, 3200, 2800, 1900, 1500, 1200],
                backgroundColor: [
                    Colors.chartColors.blue,
                    Colors.chartColors.purple,
                    Colors.chartColors.green,
                    Colors.chartColors.yellow,
                    Colors.chartColors.teal,
                    Colors.chartColors.orange
                ],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...getCommonOptions(),
            scales: {
                ...getCommonOptions().scales,
                y: {
                    ...getCommonOptions().scales.y,
                    ticks: {
                        ...getCommonOptions().scales.y.ticks,
                        callback: (value) => (value / 1000).toFixed(1) + 'k'
                    }
                }
            },
            plugins: {
                ...getCommonOptions().plugins,
                legend: { display: false }
            }
        }
    });
}

function initUserGrowthChart() {
    const ctx = document.getElementById('userGrowthChart').getContext('2d');
    const days = 30;
    const labels = generateDates(days);
    
    const allData = randomData(days, 200, 500);
    const newData = allData.map(v => Math.floor(v * 0.6));
    const returningData = allData.map((v, i) => v - newData[i]);
    
    Dashboard.userGrowthData = { all: allData, new: newData, returning: returningData };
    
    const gradientAll = ctx.createLinearGradient(0, 0, 0, 380);
    gradientAll.addColorStop(0, 'rgba(132, 94, 247, 0.3)');
    gradientAll.addColorStop(1, 'rgba(132, 94, 247, 0.05)');
    
    Dashboard.charts.userGrowth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'All Users',
                data: allData,
                borderColor: Colors.chartColors.purple,
                backgroundColor: gradientAll,
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            ...getCommonOptions(),
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

function initRadarChart() {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    Dashboard.charts.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Speed', 'Reliability', 'Usability', 'Security', 'Scalability', 'Support'],
            datasets: [{
                label: 'Current',
                data: [85, 92, 78, 88, 75, 90],
                borderColor: Colors.chartColors.blue,
                backgroundColor: 'rgba(76, 110, 245, 0.2)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: Colors.chartColors.blue
            }, {
                label: 'Target',
                data: [90, 95, 85, 92, 85, 95],
                borderColor: Colors.chartColors.green,
                backgroundColor: 'rgba(81, 207, 102, 0.15)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 4,
                pointBackgroundColor: Colors.chartColors.green
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getCSSVariable('--chart-text'),
                        font: { size: 11 },
                        padding: 16,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(45, 55, 72, 0.9)'
                }
            },
            scales: {
                r: {
                    angleLines: { color: getCSSVariable('--chart-grid') },
                    grid: { color: getCSSVariable('--chart-grid') },
                    pointLabels: {
                        color: getCSSVariable('--chart-text'),
                        font: { size: 11 }
                    },
                    ticks: {
                        color: getCSSVariable('--chart-text'),
                        backdropColor: 'transparent'
                    }
                }
            }
        }
    });
}

function initComparisonChart() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    Dashboard.charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [45000, 52000, 48000, 61000, 58000, 67000],
                backgroundColor: Colors.chartColors.blue,
                borderRadius: 4,
                borderSkipped: false
            }, {
                label: 'Expenses',
                data: [28000, 31000, 29000, 35000, 33000, 38000],
                backgroundColor: Colors.chartColors.red,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            ...getCommonOptions(),
            scales: {
                ...getCommonOptions().scales,
                x: {
                    ...getCommonOptions().scales.x,
                    stacked: true
                },
                y: {
                    ...getCommonOptions().scales.y,
                    stacked: true,
                    ticks: {
                        ...getCommonOptions().scales.y.ticks,
                        callback: (value) => '$' + (value / 1000).toFixed(0) + 'k'
                    }
                }
            }
        }
    });
}

// ============================================
// Table Functions
// ============================================
function renderTable() {
    const tbody = document.getElementById('transactions-body');
    const filteredTransactions = getFilteredTransactions();
    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / Dashboard.itemsPerPage));

    if (Dashboard.currentPage > totalPages) {
        Dashboard.currentPage = totalPages;
    }

    const start = (Dashboard.currentPage - 1) * Dashboard.itemsPerPage;
    const end = start + Dashboard.itemsPerPage;
    const pageData = filteredTransactions.slice(start, end);

    tbody.innerHTML = pageData.length > 0 ? pageData.map((trx) => `
        <tr>
            <td><strong>${trx.id}</strong></td>
            <td>${trx.customer}</td>
            <td>${trx.product}</td>
            <td>${formatCurrency(trx.amount)}</td>
            <td><span class="status-badge status-${trx.status.toLowerCase()}">${trx.status}</span></td>
            <td>${trx.date}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn" data-action="edit" data-id="${trx.id}">Edit</button>
                    <button class="table-action-btn danger" data-action="delete" data-id="${trx.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join('') : `
        <tr class="no-data-row">
            <td colspan="7">No transactions match your search. Add a new one to get started.</td>
        </tr>
    `;

    document.getElementById('showing-info').textContent = filteredTransactions.length === 0
        ? 'Showing 0 of 0'
        : `Showing ${start + 1}-${Math.min(end, filteredTransactions.length)} of ${filteredTransactions.length}`;

    document.getElementById('prev-page').disabled = Dashboard.currentPage === 1;
    document.getElementById('next-page').disabled = Dashboard.currentPage === totalPages || filteredTransactions.length === 0;
    
    renderPageNumbers(totalPages);
}

function renderPageNumbers(totalPages) {
    const container = document.getElementById('page-numbers');
    container.innerHTML = '';

    if (totalPages === 0) {
        return;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-num ${i === Dashboard.currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            Dashboard.currentPage = i;
            renderTable();
        });
        container.appendChild(btn);
    }
}

function filterTransactions(query) {
    Dashboard.searchQuery = query;
    Dashboard.currentPage = 1;
    renderTable();
}

function handleTransactionSubmit(event) {
    event.preventDefault();

    const customer = document.getElementById('transaction-customer').value.trim();
    const product = document.getElementById('transaction-product').value.trim();
    const amount = Number(document.getElementById('transaction-amount').value);
    const status = document.getElementById('transaction-status').value;
    const date = document.getElementById('transaction-date').value;

    if (!customer || !product || !date || Number.isNaN(amount)) {
        showNotification('Fill out every field before saving.', 'error');
        return;
    }

    addOrUpdateTransaction({
        customer,
        product,
        amount,
        status,
        date
    });
}

function handleTableActionClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) {
        return;
    }

    const { action, id } = button.dataset;

    if (action === 'edit') {
        const transaction = Dashboard.transactions.find((item) => item.id === id);
        if (transaction) {
            populateTransactionForm(transaction);
            document.getElementById('transaction-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    if (action === 'delete') {
        deleteTransaction(id);
    }
}

// ============================================
// Event Handlers
// ============================================
function setupEventListeners() {
    document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('transaction-cancel').addEventListener('click', clearTransactionForm);

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Refresh data
    document.getElementById('refresh-data').addEventListener('click', refreshAllData);
    
    // Export chart
    document.getElementById('export-chart').addEventListener('click', exportDashboard);
    
    // Revenue period selector
    document.getElementById('revenue-period').addEventListener('change', (e) => {
        updateRevenueChart(parseInt(e.target.value));
    });
    
    // User growth filters
    document.querySelectorAll('.chart-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateUserGrowthChart(e.target.dataset.type);
        });
    });
    
    // Table search
    document.getElementById('table-search').addEventListener('input', (e) => {
        filterTransactions(e.target.value);
    });

    // Table actions
    document.getElementById('transactions-body').addEventListener('click', handleTableActionClick);
    
    // Table rows selector
    document.getElementById('table-rows').addEventListener('change', (e) => {
        Dashboard.itemsPerPage = parseInt(e.target.value);
        Dashboard.currentPage = 1;
        renderTable();
    });
    
    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (Dashboard.currentPage > 1) {
            Dashboard.currentPage--;
            renderTable();
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(Dashboard.transactions.length / Dashboard.itemsPerPage);
        if (Dashboard.currentPage < totalPages) {
            Dashboard.currentPage++;
            renderTable();
        }
    });
}

// ============================================
// Actions
// ============================================
function toggleTheme() {
    Dashboard.currentTheme = Dashboard.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', Dashboard.currentTheme);
    document.getElementById('theme-toggle').textContent = Dashboard.currentTheme === 'light' ? '🌙' : '☀️';
    
    // Update all charts with new colors
    setTimeout(() => {
        Object.values(Dashboard.charts).forEach(chart => {
            if (chart.options.scales?.x?.ticks) {
                chart.options.scales.x.ticks.color = getCSSVariable('--chart-text');
                chart.options.scales.x.grid.color = getCSSVariable('--chart-grid');
            }
            if (chart.options.scales?.y?.ticks) {
                chart.options.scales.y.ticks.color = getCSSVariable('--chart-text');
                chart.options.scales.y.grid.color = getCSSVariable('--chart-grid');
            }
            if (chart.options.plugins?.legend?.labels) {
                chart.options.plugins.legend.labels.color = getCSSVariable('--chart-text');
            }
            if (chart.config.type === 'doughnut') {
                chart.data.datasets[0].borderColor = getCSSVariable('--bg-card');
            }
            if (chart.config.type === 'radar') {
                chart.options.scales.r.angleLines.color = getCSSVariable('--chart-grid');
                chart.options.scales.r.grid.color = getCSSVariable('--chart-grid');
                chart.options.scales.r.pointLabels.color = getCSSVariable('--chart-text');
                chart.options.scales.r.ticks.color = getCSSVariable('--chart-text');
            }
            chart.update();
        });
    }, 100);
}

function refreshAllData() {
    const btn = document.getElementById('refresh-data');
    btn.textContent = '🔄 Refreshing...';
    btn.disabled = true;

    setTimeout(() => {
        updateDashboardSummary();
        updateRevenueChart(parseInt(document.getElementById('revenue-period').value, 10));
        updateCategoryChart();
        updateTrafficChart();
        updateUserGrowthChart('all');
        updateRadarChart();
        updateComparisonChart();
        renderTable();
        
        btn.textContent = '🔄 Refresh';
        btn.disabled = false;
    }, 800);
}

function animateKPIs() {
    const kpis = [
        { id: 'revenue-value', prefix: '$', suffix: '' },
        { id: 'users-value', prefix: '', suffix: '' },
        { id: 'orders-value', prefix: '', suffix: '' },
        { id: 'conversion-value', prefix: '', suffix: '%' }
    ];
    
    kpis.forEach(kpi => {
        const el = document.getElementById(kpi.id);
        const original = el.textContent;
        let iterations = 0;
        const interval = setInterval(() => {
            if (iterations >= 10) {
                el.textContent = original;
                clearInterval(interval);
                return;
            }
            const random = Math.floor(Math.random() * 100000);
            el.textContent = kpi.prefix + random.toLocaleString() + kpi.suffix;
            iterations++;
        }, 80);
    });
}

function updateRevenueChart(days) {
    const { labels, data } = getRevenueSeries(days);
    Dashboard.revenueData = { labels, data };
    
    Dashboard.charts.revenue.data.labels = labels;
    Dashboard.charts.revenue.data.datasets[0].data = data;
    Dashboard.charts.revenue.update('active');
}

function updateCategoryChart() {
    const data = [30 + Math.floor(Math.random() * 20), 
                  20 + Math.floor(Math.random() * 15), 
                  15 + Math.floor(Math.random() * 15), 
                  8 + Math.floor(Math.random() * 8), 
                  5 + Math.floor(Math.random() * 8)];
    Dashboard.charts.category.data.datasets[0].data = data;
    Dashboard.charts.category.update('active');
}

function updateTrafficChart() {
    const data = randomData(6, 1000, 5000);
    Dashboard.charts.traffic.data.datasets[0].data = data;
    Dashboard.charts.traffic.update('active');
}

function updateUserGrowthChart(type) {
    const days = 30;
    const labels = generateDates(days);
    let data, color, label;
    
    if (type === 'all') {
        data = Dashboard.userGrowthData.all;
        color = Colors.chartColors.purple;
        label = 'All Users';
    } else if (type === 'new') {
        data = Dashboard.userGrowthData.new;
        color = Colors.chartColors.blue;
        label = 'New Users';
    } else {
        data = Dashboard.userGrowthData.returning;
        color = Colors.chartColors.green;
        label = 'Returning Users';
    }
    
    const ctx = document.getElementById('userGrowthChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 380);
    gradient.addColorStop(0, color + '4D');
    gradient.addColorStop(1, color + '0D');
    
    Dashboard.charts.userGrowth.data.datasets[0].data = data;
    Dashboard.charts.userGrowth.data.datasets[0].borderColor = color;
    Dashboard.charts.userGrowth.data.datasets[0].backgroundColor = gradient;
    Dashboard.charts.userGrowth.data.datasets[0].label = label;
    Dashboard.charts.userGrowth.update('active');
}

function updateRadarChart() {
    const current = randomData(6, 70, 95);
    const target = randomData(6, 80, 100);
    Dashboard.charts.radar.data.datasets[0].data = current;
    Dashboard.charts.radar.data.datasets[1].data = target;
    Dashboard.charts.radar.update('active');
}

function updateComparisonChart() {
    const revenue = randomData(6, 40000, 70000);
    const expenses = revenue.map(v => Math.floor(v * (0.4 + Math.random() * 0.2)));
    Dashboard.charts.comparison.data.datasets[0].data = revenue;
    Dashboard.charts.comparison.data.datasets[1].data = expenses;
    Dashboard.charts.comparison.update('active');
}

function exportDashboard() {
    // Simple export - downloads the revenue chart as image
    const link = document.createElement('a');
    link.download = 'revenue-chart.png';
    link.href = Dashboard.charts.revenue.toBase64Image();
    link.click();
    
    // Show notification
    showNotification('Dashboard exported successfully!', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 24px;
        background: ${type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#4c6ef5'};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ============================================
// Initialize Dashboard
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize charts
    initRevenueChart();
    initCategoryChart();
    initTrafficChart();
    initUserGrowthChart();
    initRadarChart();
    initComparisonChart();
    
    // Initialize table data
    Dashboard.transactions = loadTransactions();
    updateDashboardSummary();
    clearTransactionForm();
    updateRevenueChart(parseInt(document.getElementById('revenue-period').value, 10));
    renderTable();
    
    // Setup interactions
    setupEventListeners();
    
    // Log
    console.log('🚀 Interactive Analytics Dashboard loaded successfully!');
    console.log('Available charts:', Object.keys(Dashboard.charts).join(', '));
});
