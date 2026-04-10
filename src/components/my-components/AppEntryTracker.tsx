import { useEffect } from 'react'
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

    return null
}