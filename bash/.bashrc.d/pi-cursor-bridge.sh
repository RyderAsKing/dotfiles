# Keep Cursor SDK runs Cursor native.
# With the pi tool bridge off, Cursor never sees pi tools, including the
# pi subagent. Cursor delegates to its own explore, bash, browser, and
# custom agents instead. Set to 1 or unset to re-enable the bridge.
export PI_CURSOR_PI_TOOL_BRIDGE=0
