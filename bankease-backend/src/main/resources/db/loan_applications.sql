CREATE TABLE IF NOT EXISTS loan_applications (
    application_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    loan_type VARCHAR(20) NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    annual_interest_rate DECIMAL(5, 2) NOT NULL,
    term_years INT NOT NULL,
    monthly_emi DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (application_id),
    CONSTRAINT fk_loan_applications_user
        FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT chk_loan_application_type
        CHECK (loan_type IN ('PERSONAL', 'HOME', 'VEHICLE', 'EDUCATION')),
    CONSTRAINT chk_loan_application_status
        CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'))
) ENGINE=InnoDB;
