#!/bin/bash
# Neo Linear Production Management Script
# Usage: ./manage-production.sh [start|stop|restart|status|logs]

set -e

PROJECT_ROOT="/home/Linear-Clone"
SERVER_DIR="$PROJECT_ROOT/server"
ENV_FILE="$PROJECT_ROOT/.env"
PID_DIR="$PROJECT_ROOT/pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure PID directory exists
mkdir -p "$PID_DIR"

# Load environment variables
load_env() {
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)
    else
        echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
        exit 1
    fi
}

# Check if a service is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Start backend server
start_backend() {
    if is_running "$BACKEND_PID_FILE"; then
        echo -e "${YELLOW}Backend is already running (PID: $(cat $BACKEND_PID_FILE))${NC}"
        return 0
    fi

    echo -e "${GREEN}Starting backend server...${NC}"
    cd "$SERVER_DIR"
    load_env

    NODE_ENV=production nohup node dist/index.js > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID_FILE"

    # Wait for startup
    sleep 3

    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}Backend started successfully (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}Backend failed to start. Check logs at $PROJECT_ROOT/logs/backend.log${NC}"
        rm -f "$BACKEND_PID_FILE"
        return 1
    fi
}

# Stop backend server
stop_backend() {
    if ! is_running "$BACKEND_PID_FILE"; then
        echo -e "${YELLOW}Backend is not running${NC}"
        rm -f "$BACKEND_PID_FILE"
        return 0
    fi

    echo -e "${YELLOW}Stopping backend server...${NC}"
    local pid=$(cat "$BACKEND_PID_FILE")
    kill "$pid" 2>/dev/null || true

    # Wait for graceful shutdown
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done

    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${YELLOW}Force killing backend...${NC}"
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$BACKEND_PID_FILE"
    echo -e "${GREEN}Backend stopped${NC}"
}

# Start frontend server
start_frontend() {
    if is_running "$FRONTEND_PID_FILE"; then
        echo -e "${YELLOW}Frontend is already running (PID: $(cat $FRONTEND_PID_FILE))${NC}"
        return 0
    fi

    echo -e "${GREEN}Starting frontend server...${NC}"
    cd "$PROJECT_ROOT"

    nohup npm run preview > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID_FILE"

    # Wait for startup
    sleep 3

    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}Frontend started successfully (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}Frontend failed to start. Check logs at $PROJECT_ROOT/logs/frontend.log${NC}"
        rm -f "$FRONTEND_PID_FILE"
        return 1
    fi
}

# Stop frontend server
stop_frontend() {
    if ! is_running "$FRONTEND_PID_FILE"; then
        echo -e "${YELLOW}Frontend is not running${NC}"
        rm -f "$FRONTEND_PID_FILE"
        return 0
    fi

    echo -e "${YELLOW}Stopping frontend server...${NC}"
    local pid=$(cat "$FRONTEND_PID_FILE")
    kill "$pid" 2>/dev/null || true

    # Wait for graceful shutdown
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done

    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${YELLOW}Force killing frontend...${NC}"
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$FRONTEND_PID_FILE"
    echo -e "${GREEN}Frontend stopped${NC}"
}

# Show service status
show_status() {
    echo -e "${GREEN}Neo Linear Production Status${NC}"
    echo "================================"

    # Backend status
    if is_running "$BACKEND_PID_FILE"; then
        local pid=$(cat "$BACKEND_PID_FILE")
        echo -e "Backend: ${GREEN}Running${NC} (PID: $pid)"
    else
        echo -e "Backend: ${RED}Stopped${NC}"
    fi

    # Frontend status
    if is_running "$FRONTEND_PID_FILE"; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        echo -e "Frontend: ${GREEN}Running${NC} (PID: $pid)"
    else
        echo -e "Frontend: ${RED}Stopped${NC}"
    fi

    # Nginx status
    if systemctl is-active --quiet nginx; then
        echo -e "Nginx: ${GREEN}Running${NC}"
    else
        echo -e "Nginx: ${RED}Stopped${NC}"
    fi

    # Docker status
    if docker compose ps | grep -q "Up"; then
        echo -e "Docker (PostgreSQL/Redis): ${GREEN}Running${NC}"
    else
        echo -e "Docker (PostgreSQL/Redis): ${RED}Stopped${NC}"
    fi

    echo "================================"

    # Test endpoints
    echo ""
    echo -e "${GREEN}Endpoint Tests:${NC}"
    echo -n "Backend API: "
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi

    echo -n "Frontend: "
    if curl -s http://localhost:4173 > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi

    echo -n "HTTPS (nginx): "
    if curl -s https://linear.neodigital.co.id > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
}

# Show logs
show_logs() {
    local service=$1
    case "$service" in
        backend)
            if [ -f "$PROJECT_ROOT/logs/backend.log" ]; then
                tail -f "$PROJECT_ROOT/logs/backend.log"
            else
                echo -e "${RED}Backend log file not found${NC}"
            fi
            ;;
        frontend)
            if [ -f "$PROJECT_ROOT/logs/frontend.log" ]; then
                tail -f "$PROJECT_ROOT/logs/frontend.log"
            else
                echo -e "${RED}Frontend log file not found${NC}"
            fi
            ;;
        *)
            echo "Usage: $0 logs [backend|frontend]"
            exit 1
            ;;
    esac
}

# Main command handling
case "$1" in
    start)
        mkdir -p "$PROJECT_ROOT/logs"
        start_backend
        start_frontend
        echo -e "${GREEN}All services started${NC}"
        ;;
    stop)
        stop_backend
        stop_frontend
        echo -e "${GREEN}All services stopped${NC}"
        ;;
    restart)
        stop_backend
        stop_frontend
        sleep 2
        start_backend
        start_frontend
        echo -e "${GREEN}All services restarted${NC}"
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs [backend|frontend]}"
        exit 1
        ;;
esac
