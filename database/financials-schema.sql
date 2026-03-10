-- Financials Management Schema

-- Financial statements/documents
CREATE TABLE IF NOT EXISTS financial_statements (
    id SERIAL PRIMARY KEY,
    statement_type VARCHAR(50) NOT NULL, -- 'bank', 'trading', 'credit_card', 'invoice', 'expense_report'
    statement_period VARCHAR(20), -- 'YYYY-MM' or 'Q1 2026'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'complete', 'error'
    
    -- Extracted data (JSON)
    extracted_data JSONB,
    
    -- Summary metrics
    total_income DECIMAL(12,2),
    total_expenses DECIMAL(12,2),
    net_profit DECIMAL(12,2),
    
    notes TEXT
);

-- Monthly financial metrics
CREATE TABLE IF NOT EXISTS monthly_metrics (
    id SERIAL PRIMARY KEY,
    period VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    
    -- Revenue
    revenue_total DECIMAL(12,2) DEFAULT 0,
    revenue_subscriptions DECIMAL(12,2) DEFAULT 0,
    revenue_one_time DECIMAL(12,2) DEFAULT 0,
    
    -- Expenses
    expenses_total DECIMAL(12,2) DEFAULT 0,
    expenses_payroll DECIMAL(12,2) DEFAULT 0,
    expenses_marketing DECIMAL(12,2) DEFAULT 0,
    expenses_software DECIMAL(12,2) DEFAULT 0,
    expenses_other DECIMAL(12,2) DEFAULT 0,
    
    -- Profit
    net_profit DECIMAL(12,2) DEFAULT 0,
    profit_margin DECIMAL(5,2), -- Percentage
    
    -- Growth
    revenue_growth_pct DECIMAL(5,2), -- vs previous month
    profit_growth_pct DECIMAL(5,2),
    
    -- RLT-specific
    mrr DECIMAL(12,2), -- Monthly Recurring Revenue
    arr DECIMAL(12,2), -- Annual Recurring Revenue
    active_subscribers INTEGER,
    churn_rate DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(period)
);

-- Transactions/line items
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    statement_id INTEGER REFERENCES financial_statements(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'revenue', 'payroll', 'marketing', 'software', etc.
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20), -- 'income', 'expense'
    
    -- Metadata
    vendor VARCHAR(255),
    payment_method VARCHAR(50),
    tags TEXT[],
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial goals/targets
CREATE TABLE IF NOT EXISTS financial_goals (
    id SERIAL PRIMARY KEY,
    period VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    goal_type VARCHAR(50), -- 'revenue', 'profit', 'mrr', 'subscribers'
    target_value DECIMAL(12,2),
    actual_value DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_statements_period ON financial_statements(statement_period);
CREATE INDEX IF NOT EXISTS idx_financial_statements_type ON financial_statements(statement_type);
CREATE INDEX IF NOT EXISTS idx_monthly_metrics_period ON monthly_metrics(period DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_financial_goals_period ON financial_goals(period);

-- Trigger to update monthly_metrics.updated_at
CREATE OR REPLACE FUNCTION update_monthly_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER monthly_metrics_updated_at_trigger
BEFORE UPDATE ON monthly_metrics
FOR EACH ROW EXECUTE FUNCTION update_monthly_metrics_updated_at();
