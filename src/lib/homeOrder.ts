import { videos, type Video } from "@/data/videos";
import { favoritesFirst } from "@/lib/favorites";
import { createStore } from "@/lib/store";

const store = createStore<Video[]>(favoritesFirst(videos));

export const subscribeHomeOrder = store.subscribe;
export const getHomeOrder = store.get;
export const getServerHomeOrder = (): Video[] => videos;
export const reshuffleHome = () => store.set(favoritesFirst(videos));
