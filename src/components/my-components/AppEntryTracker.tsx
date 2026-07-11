import { useEffect } from 'react'
import Swal from 'sweetalert2'
import posthog from '../../lib/posthog'

function cleanParam(value: string | null): string | undefined {
    return value && value.trim() ? value : undefined
}

export default function AppEntryTracker() {
    useEffect(() => {
        const url = new URL(window.location.href)
        const params = url.searchParams

        const utm_source = cleanParam(params.get('utm_source'))
        const utm_medium = cleanParam(params.get('utm_medium'))
        const utm_campaign = cleanParam(params.get('utm_campaign'))
        const utm_content = cleanParam(params.get('utm_content'))
        const entry_point = cleanParam(params.get('entry_point'))
        const web_distinct_id = new URL(window.location.href).searchParams.get('web_distinct_id')

        posthog.capture('app_opened', {
            entry_platform: 'web_app',
            landing_path: url.pathname,
            landing_url: url.href,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            entry_point,
            web_distinct_id
        })
    }, [])

    useEffect(() => {
        const now = Date.now();
        const cutoff = new Date('2026-07-22T00:00:00+03:00').getTime();

        if (now >= cutoff) {
            const hasBeenNotified = localStorage.getItem('sosika_free_delivery_restored_notified');
            if (hasBeenNotified !== 'true') {
                Swal.fire({
                    title: 'Free Delivery is Back! 🚚🎉',
                    html: `
                      <p style="margin-bottom: 10px;">Our <strong>Free Delivery Pass</strong> has returned!</p>
                      <p style="font-size: 13px; color: #a1a1aa;">Enjoy 3 free scheduled deliveries every 2 weeks as usual.</p>
                    `,
                    icon: 'success',
                    confirmButtonText: 'Great, thanks!',
                    confirmButtonColor: '#00bfff',
                    background: '#0a0a0b',
                    color: '#fff',
                    customClass: {
                        popup: 'border border-white/[0.08] rounded-2xl',
                        confirmButton: 'px-6 py-2.5 font-semibold text-sm rounded-xl'
                    }
                });
                localStorage.setItem('sosika_free_delivery_restored_notified', 'true');
            }
        }
    }, []);

    return null
}