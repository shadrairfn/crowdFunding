import axios from 'axios';
import crypto from 'crypto';

class XenditService {
    constructor() {
        this.apiKey = process.env.XENDIT_SECRET_KEY;
        this.baseURL = 'https://api.xendit.co';
        this.webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
        
        if (!this.apiKey) {
            throw new Error('XENDIT_SECRET_KEY is required in environment variables');
        }
    }

    // Create invoice for donation
    async createInvoice(donationData) {
        try {
            const {
                external_id,
                amount,
                description,
                invoice_duration = 86400, // 24 hours in seconds
                customer_name,
                customer_email,
                payment_methods = ['QRIS']
            } = donationData;

            const invoiceData = {
                external_id,
                amount,
                description,
                invoice_duration,
                customer: {
                    given_names: customer_name,
                    email: customer_email
                },
                payment_methods,
                success_redirect_url: `${process.env.FRONTEND_URL}/donation/success`,
                failure_redirect_url: `${process.env.FRONTEND_URL}/donation/failed`,
                currency: 'IDR',
                items: [
                    {
                        name: description,
                        quantity: 1,
                        price: amount
                    }
                ]
            };

            console.log('📤 Sending to Xendit:', {
                url: `${this.baseURL}/v2/invoices`,
                external_id,
                amount,
                payment_methods
            });

            const response = await axios.post(
                `${this.baseURL}/v2/invoices`,
                invoiceData,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('📥 Full Xendit Response:', {
                status: response.status,
                data: response.data
            });

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Xendit Create Invoice Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // Get invoice details
    async getInvoice(invoiceId) {
        try {
            const response = await axios.get(
                `${this.baseURL}/v2/invoices/${invoiceId}`,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Xendit Get Invoice Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    // Create disbursement (payout)
    async createDisbursement(disbursementData) {
        try {
        const {
            external_id,
            amount,
            bank_code,
            account_number,
            account_holder_name,
            description
        } = disbursementData;
    
        console.log("📤 Sending Disbursement to Xendit:", {
            external_id,
            amount,
            bank_code,
            account_number,
            account_holder_name,
            description
        });
    
        const response = await axios.post(
            `${this.baseURL}/disbursements`,
            {
            external_id,
            amount,
            bank_code,
            account_number,
            account_holder_name,
            description
            },
            {
            headers: {
                'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            }
            }
        );
    
        console.log("📥 Xendit Disbursement Response:", response.data);
    
        return { success: true, data: response.data };
        } catch (error) {
        console.error("Xendit Create Disbursement Error:", error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
        }
    }
  

    // Verify webhook signature
    verifyWebhookSignature(rawBody, signature) {
        if (!this.webhookToken) {
            console.warn('XENDIT_WEBHOOK_TOKEN not set, skipping signature verification');
            return true; // Skip verification if token not set
        }

        const computedSignature = crypto
            .createHmac('sha256', this.webhookToken)
            .update(rawBody)
            .digest('hex');

        return computedSignature === signature;
    }

    // Process webhook data
    processWebhookData(webhookData) {
        const { status, external_id, id: invoice_id, paid_at } = webhookData;
        
        let payment_status;
        switch (status) {
            case 'PAID':
                payment_status = 'paid';
                break;
            case 'EXPIRED':
                payment_status = 'expired';
                break;
            case 'PENDING':
                payment_status = 'pending';
                break;
            default:
                payment_status = 'failed';
        }

        return {
            payment_status,
            external_id,
            invoice_id,
            paid_at: paid_at ? new Date(paid_at) : null,
            webhook_data: webhookData
        };
    }
}

export default new XenditService();
