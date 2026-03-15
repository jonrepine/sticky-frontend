import { gql } from "@apollo/client";

export const HEALTH_WITH_FEATURE_FLAGS = gql`
  query HealthWithFeatureFlags {
    health {
      ok
      service
      featureFlags
    }
  }
`;

export const HEALTH = gql`
  query Health {
    health {
      ok
      service
    }
  }
`;

