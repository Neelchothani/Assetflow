package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeletionSummaryResponse {
    private String message;
    private int costingsDeleted;
    private int assetsDeleted;
    private int movementsDeleted;
    private int vendorsDeleted;
    private int totalDeleted;

    public DeletionSummaryResponse(int costingsDeleted, int assetsDeleted, int movementsDeleted, int vendorsDeleted) {
        this.costingsDeleted = costingsDeleted;
        this.assetsDeleted = assetsDeleted;
        this.movementsDeleted = movementsDeleted;
        this.vendorsDeleted = vendorsDeleted;
        this.totalDeleted = costingsDeleted + assetsDeleted + movementsDeleted + vendorsDeleted;
        
        this.message = String.format(
            "Successfully deleted file and its associated data: %d assets, %d movements, and %d vendors",
            assetsDeleted, movementsDeleted, vendorsDeleted
        );
    }
}
