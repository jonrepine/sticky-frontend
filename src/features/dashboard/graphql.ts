import { gql } from "@apollo/client";

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboardInfoBits(limitPerTag: 25, tagLimit: 20) {
      flaggedInfoBits {
        infoBitId
        title
        status
      }
      flaggedCards {
        cardId
        infoBitId
        frontBlocks {
          type
          text
        }
      }
      sectionsByTag {
        tag {
          tagId
          name
        }
        infoBits {
          infoBitId
          title
          dueAt
          cards {
            cardId
          }
        }
      }
    }
  }
`;
