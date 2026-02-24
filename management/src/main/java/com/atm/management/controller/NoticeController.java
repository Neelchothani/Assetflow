package com.atm.management.controller;

import com.atm.management.dto.request.NoticeRequest;
import com.atm.management.dto.response.NoticeResponse;
import com.atm.management.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NoticeController {

    private final NoticeService noticeService;

    /** GET /api/notices — all notices */
    @GetMapping
    public ResponseEntity<List<NoticeResponse>> getAllNotices() {
        return ResponseEntity.ok(noticeService.getAllNotices());
    }

    /** GET /api/notices/status/{status} — filter by invoice status */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<NoticeResponse>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(noticeService.getByInvoiceStatus(status));
    }

    /** POST /api/notices — create a manual notice */
    @PostMapping
    public ResponseEntity<NoticeResponse> createNotice(@RequestBody NoticeRequest req) {
        return ResponseEntity.ok(noticeService.createNotice(req));
    }

    /** PATCH /api/notices/{id}/invoice-status — update invoice status */
    @PatchMapping("/{id}/invoice-status")
    public ResponseEntity<NoticeResponse> updateInvoiceStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("invoiceStatus");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(noticeService.updateInvoiceStatus(id, status));
    }

    /** DELETE /api/notices/{id} — delete single notice */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotice(@PathVariable Long id) {
        noticeService.deleteNotice(id);
        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/notices/flush — flush all notices */
    @DeleteMapping("/flush")
    public ResponseEntity<Map<String, String>> flushAll() {
        noticeService.flushAll();
        return ResponseEntity.ok(Map.of("message", "All notices deleted"));
    }

    /** DELETE /api/notices/flush/{status} — flush notices by status */
    @DeleteMapping("/flush/{status}")
    public ResponseEntity<Map<String, String>> flushByStatus(@PathVariable String status) {
        noticeService.flushByStatus(status);
        return ResponseEntity.ok(Map.of("message", "Notices with status " + status + " deleted"));
    }

    /** POST /api/notices/sync-delivery — auto-generate delivery notices */
    @PostMapping("/sync-delivery")
    public ResponseEntity<Map<String, Object>> syncDelivery() {
        int count = noticeService.syncDeliveryNotices();
        return ResponseEntity.ok(Map.of("created", count));
    }
}
