import { earthEvents } from "./events/earth";
import { healthEvents } from "./events/health";
import { knowledgeEvents } from "./events/knowledge";
import { societyEvents } from "./events/societies";
import { sources } from "./sources";
import { places } from "./places";
import { tags } from "./tags";
import { relations } from "./relations";
import { comparisons } from "./comparisons";

export const rawSeed = {
  events: [...earthEvents, ...healthEvents, ...knowledgeEvents, ...societyEvents],
  sources,
  places,
  tags,
  relations,
  comparisons,
};

export type RawSeed = typeof rawSeed;
