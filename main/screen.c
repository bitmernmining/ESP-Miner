#include <string.h>
#include "esp_log.h"
#include "esp_err.h"
#include "esp_check.h"
#include "lvgl.h"
#include "esp_lvgl_port.h"
#include "global_state.h"
#include "screen.h"
#include "nvs_config.h"
#include "display.h"
#include "connect.h"
#include "esp_timer.h"

typedef enum {
    SCR_SELF_TEST,
    SCR_OVERHEAT,
    SCR_ASIC_STATUS,
    SCR_WELCOME,
    SCR_FIRMWARE,
    SCR_CONNECTION,
    SCR_BITAXE_LOGO,
    SCR_OSMU_LOGO,
    SCR_URLS,
    SCR_STATS,
    SCR_MINING,
    SCR_WIFI,
    MAX_SCREENS,
} screen_t;

#define SCREEN_UPDATE_MS 500
#define BUTTON_WAKE_MS 5000

#define SCR_CAROUSEL_START SCR_URLS

extern const lv_img_dsc_t osmu_logo;
extern const lv_img_dsc_t identify_text;

static lv_obj_t * screens[MAX_SCREENS];
static int delays_ms[MAX_SCREENS] = {0, 0, 0, 0, 0, 1000, 3000, 3000, 10000, 10000, 10000, 10000};

static int current_screen_time_ms;
static int current_screen_delay_ms;

// static int screen_chars;
static int screen_lines;

static GlobalState * GLOBAL_STATE;

static lv_obj_t *self_test_message_label;
static lv_obj_t *self_test_result_label;
static lv_obj_t *self_test_finished_label;

static lv_obj_t *overheat_ip_addr_label;

static lv_obj_t *asic_status_label;

static lv_obj_t *mining_block_height_label;
static lv_obj_t *mining_network_difficulty_label;
static lv_obj_t *mining_scriptsig_title_label;
static lv_obj_t *mining_scriptsig_label;

static lv_obj_t *firmware_update_scr_filename_label;
static lv_obj_t *firmware_update_scr_status_label;

static lv_obj_t *connection_wifi_status_label;

static lv_obj_t *urls_ip_addr_label;
static lv_obj_t *urls_mining_url_label;

static lv_obj_t *stats_hashrate_label;
static lv_obj_t *stats_efficiency_label;
static lv_obj_t *stats_difficulty_label;
static lv_obj_t *stats_temp_label;

static lv_obj_t *wifi_rssi_value_label;
static lv_obj_t *wifi_signal_strength_label;
static lv_obj_t *wifi_uptime_label;

static lv_obj_t *notification_label;
static lv_obj_t *identify_image;

static float current_hashrate;
static float current_power;
static uint64_t current_difficulty;
static float current_chip_temp;
static uint32_t current_uptime_seconds;

#define NOTIFICATION_SHARE_ACCEPTED (1 << 0)
#define NOTIFICATION_SHARE_REJECTED (1 << 1)
#define NOTIFICATION_WORK_RECEIVED  (1 << 2)

static const char *notifications[] = {
    "",     // 0b000: NONE
    "↑",    // 0b001:                   ACCEPTED
    "x",    // 0b010:          REJECTED
    "x↑",   // 0b011:          REJECTED ACCEPTED
    "↓",    // 0b100: RECEIVED
    "↕",    // 0b101: RECEIVED          ACCEPTED
    "x↓",   // 0b110: RECEIVED REJECTED 
    "x↕"    // 0b111: RECEIVED REJECTED ACCEPTED
};

static uint64_t current_shares_accepted;
static uint64_t current_shares_rejected;
static uint64_t current_work_received;
static int8_t current_rssi_value;
static int current_block_height;

static screen_t get_current_screen() {
    lv_obj_t * active_screen = lv_screen_active();
    for (screen_t scr = 0; scr < MAX_SCREENS; scr++) {
        if (screens[scr] == active_screen) return scr;
    }
    return -1;
}

static lv_obj_t * create_flex_screen(int expected_lines) {
    lv_obj_t * scr = lv_obj_create(NULL);

    lv_obj_set_flex_flow(scr, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(scr, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
    // Give text a bit more space on larger displays
    if (screen_lines > expected_lines) lv_obj_set_style_pad_row(scr, 1, LV_PART_MAIN);

    return scr;
}

static lv_obj_t * create_scr_self_test() {
    lv_obj_t * scr = create_flex_screen(4);

    lv_obj_t *label1 = lv_label_create(scr);
    lv_label_set_text(label1, "BITMERN SELF-TEST");

    self_test_message_label = lv_label_create(scr);
    self_test_result_label = lv_label_create(scr);
    self_test_finished_label = lv_label_create(scr);

    return scr;
}
