// Define the interface based on the Meseji API response documentation
interface MesejiResponse {
    batch_id: string;
    total_recipients: number;
    estimated_cost: number;
    status: 'queued' | 'sent' | 'failed'; // adjusting dynamically based on their api statuses
    message?: string;
}

export const sendMesejiSMS = async (toPhone: string, message: string): Promise<MesejiResponse | undefined> => {
    const API_URL = 'https://meseji.co.tz/api/v1/sms/send';
    const API_KEY = import.meta.env.VITE_MESEJI_API_KEY as string;
    const SENDER_ID = import.meta.env.VITE_MESEJI_SENDER_ID as string; // e.g., 'SOSIKA'

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                sender_id: SENDER_ID,
                message: message,
                contacts: toPhone // Accepts a single string '255...' or comma-separated '255...,255...'
            })
        });

        const data = await response.json() as MesejiResponse;

        if (!response.ok) {
            throw new Error(data.message || 'SMS failed to send');
        }

        return data;
    } catch (error) {
        console.warn(`Meseji SMS failed for [${toPhone}]:`, error);
        return undefined;
    }
};