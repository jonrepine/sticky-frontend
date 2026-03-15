import { gql } from "@apollo/client";

export const DAILY_ENGAGEMENT = gql`
  query DailyEngagement($windowDays: Int) {
    dailyEngagement(windowDays: $windowDays) {
      date
      addedCount
      learnedCount
      reviewedCount
      totalCount
    }
  }
`;
