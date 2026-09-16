import { videos, type Video } from "@/data/videos";
import { shuffle } from "@/lib/shuffle";
import { createStore } from "@/lib/store";

const store = createStore<Video[]>(shuffle(videos));

export const subscribeHomeOrder = store.subscribe;
export const getHomeOrder = store.get;
export const getServerHomeOrder = (): Video[] => videos;
export const reshuffleHome = () => store.set(shuffle(videos));
