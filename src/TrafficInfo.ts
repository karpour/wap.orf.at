import { LRUCache } from 'lru-cache';
import { useAdapter } from '@type-cacheable/lru-cache-adapter';
import { Cacheable, CacheClear } from '@type-cacheable/core';
import { encodeEntities } from './encodeEntities';

const client = new LRUCache<string, any>({
    max: 500,
    ttl: 1000 * 600
});
const clientAdapter = useAdapter(client);

export type TrafficInfoData = {
    TrafficItems: {
        Text: string;
        Street: string;
        District: string;
        EventCode: number;
        EventImage: string;
        Coordinates: {
            Longitude: number,
            Latitude: number;
        }[];
    }[];
};

const TRAFFIC_INFO_URL = "https://oe3meta.orf.at/oe3api/ApiV2.php/TrafficInfo.json";

export class TrafficInfo {
    @Cacheable({ cacheKey: 'trafficInfo' })
    public static async getTrafficInfo(): Promise<TrafficInfoData> {
        console.log(`Fetching ${TRAFFIC_INFO_URL}`);
        const data = await (await fetch(TRAFFIC_INFO_URL)).json() as TrafficInfoData;
        for (const item of data.TrafficItems) {
            item.Text = encodeEntities(item.Text);
            item.Street = encodeEntities(item.Street);
            item.District = encodeEntities(item.District);
        }
        //console.log(data);
        return data;
    }

    @CacheClear({ cacheKey: 'trafficInfo' })
    public static clearCache() {
        console.log(`Cleared traffic info cache`);
    }
}
