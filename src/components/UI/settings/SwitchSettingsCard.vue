<template>
  <transition name="fade">
    <div class="settings-card">
      <div class="header">Налаштування вимикача</div>
      <div class="settings-section">
        <label>Висота від підлоги:</label>
        <div class="step-control">
          <button @click="decreaseFloorHeight" :disabled="floorHeight <= 500">-</button>
          <span
              class="editable-value"
              contenteditable
              @blur="handleFloorHeightBlur"
              @keydown.enter.prevent="handleEnter"
          >{{ displayFloorHeight }}</span>
          <button @click="increaseFloorHeight" :disabled="isFloorHeightExceedingLimit">+</button>
        </div>
      </div>
      <div class="preset-grid">
        <button
            v-for="preset in convertedFloorHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isFloorHeightPresetActive(preset.value) }]"
            @click="setFloorHeight(preset.value)"
            :disabled="preset.value > wallHeight"
        >
          {{ preset.display }}
        </button>
      </div>
      <hr>
      <div class="switch-list">
        <div class="group-header">Одинарний вмикач</div>
        <div 
          v-for="switchObj in singleSwitches" 
          :key="switchObj.id"
          class="switch-item"
          :class="{ 
            'highlighted': hoveredSwitchIds.includes(switchObj.id),
            'hover-active': isHoveringSwitch === switchObj.id
          }"
          @mouseenter="handleSwitchHover(switchObj, true)"
          @mouseleave="handleSwitchHover(switchObj, false)"
        >
          <div class="switch-icon">⌇</div>
          <div class="switch-info">
            <div>Single Switch</div>
            <div class="height-info">H={{ formatHeight(switchObj.dimensions.floorHeight) }}</div>
            <div class="connection-field">
              <div 
                class="empty-connection"
                :class="{
                  'drop-target': isDraggedOver(switchObj.id, 1),
                  'connected': switchObj.connectedGroup,
                  'hover-active': isHoveringConnection && switchObj.connectedGroup
                }"
                @dragover.prevent="handleDragOver(switchObj.id, 1)"
                @dragleave="handleDragLeave(switchObj.id, 1)"
                @drop.prevent="handleDrop(switchObj.id, 1, $event)"
                @click="handleConnectionClick(switchObj.id, 1)"
                @mouseenter.stop="handleConnectionHover(switchObj.connectedGroup, true)"
                @mouseleave.stop="handleConnectionHover(switchObj.connectedGroup, false)"
              >
                <span class="connection-label">Connection 1:</span>
                <span class="empty-text" v-if="!switchObj.connectedGroup">Not connected</span>
                <span class="connected-text" v-else>{{ switchObj.connectedGroup.name }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="group-header">Подвійний вмикач</div>
        <div 
          v-for="switchObj in doubleSwitches" 
          :key="switchObj.id"
          class="switch-item"
          :class="{ 
            'highlighted': hoveredSwitchIds.includes(switchObj.id),
            'hover-active': isHoveringSwitch === switchObj.id
          }"
          @mouseenter="handleSwitchHover(switchObj, true)"
          @mouseleave="handleSwitchHover(switchObj, false)"
        >
          <div class="switch-icon">⌇⌇</div>
          <div class="switch-info">
            <div>Double Switch</div>
            <div class="height-info">H={{ formatHeight(switchObj.dimensions.floorHeight) }}</div>
            <div class="connection-field">
              <div 
                class="empty-connection"
                :class="{
                  'drop-target': isDraggedOver(switchObj.id, 1),
                  'connected': switchObj.connectedGroup1,
                  'hover-active': isHoveringConnection && switchObj.connectedGroup1
                }"
                @dragover.prevent="handleDragOver(switchObj.id, 1)"
                @dragleave="handleDragLeave(switchObj.id, 1)"
                @drop.prevent="handleDrop(switchObj.id, 1, $event)"
                @click="handleConnectionClick(switchObj.id, 1)"
                @mouseenter.stop="handleConnectionHover(switchObj.connectedGroup1, true)"
                @mouseleave.stop="handleConnectionHover(switchObj.connectedGroup1, false)"
              >
                <span class="connection-label">Connection 1:</span>
                <span class="empty-text" v-if="!switchObj.connectedGroup1">Not connected</span>
                <span class="connected-text" v-else>{{ switchObj.connectedGroup1.name }}</span>
              </div>
              <div 
                class="empty-connection"
                :class="{
                  'drop-target': isDraggedOver(switchObj.id, 2),
                  'connected': switchObj.connectedGroup2,
                  'hover-active': isHoveringConnection && switchObj.connectedGroup2
                }"
                @dragover.prevent="handleDragOver(switchObj.id, 2)"
                @dragleave="handleDragLeave(switchObj.id, 2)"
                @drop.prevent="handleDrop(switchObj.id, 2, $event)"
                @click="handleConnectionClick(switchObj.id, 2)"
                @mouseenter.stop="handleConnectionHover(switchObj.connectedGroup2, true)"
                @mouseleave.stop="handleConnectionHover(switchObj.connectedGroup2, false)"
              >
                <span class="connection-label">Connection 2:</span>
                <span class="empty-text" v-if="!switchObj.connectedGroup2">Not connected</span>
                <span class="connected-text" v-else>{{ switchObj.connectedGroup2.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <hr>
      <div class="light-groups">
        <div class="group-header">Групи світильників:</div>
        <div 
          v-for="group in lightGroups" 
          :key="group.id"
          class="group-item"
          draggable="true"
          @dragstart="handleDragStart(group)"
          @dragend="handleDragEnd"
          @mouseenter="handleGroupHover(group, true)"
          @mouseleave="handleGroupHover(group, false)"
        >
          <div class="group-name">{{ group.name }}</div>
          <div class="group-stats">
            <span class="light-count" v-if="getGroupLightCount(group) > 0">
              {{ getGroupLightCount(group) }} lights
            </span>
          </div>
        </div>
        <div v-if="lightGroups.length === 0" class="empty-groups">
          Групи світильників не знайдено. Створіть групи в панелі світильників.
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex';
export default {
  name: 'SwitchSettingsCard',
  props: {
    floorHeight: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true,
      validator: (value) => ['mm', 'cm', 'm'].includes(value)
    }
  },
  data() {
    return {
      floorHeightPresets: [
        { value: 100, display: '10' },
        { value: 300, display: '30' },
        { value: 900, display: '90' }
      ],
      stepMap: {
        mm: { floorHeight: 50 },
        cm: { floorHeight: 5 },
        m: { floorHeight: 0.05 }
      },
      draggedGroup: null,
      draggedOverSwitch: null,
      draggedOverConnection: null,
      isHoveringSwitch: null,
      isHoveringConnection: false
    }
  },
  computed: {
    ...mapState('project', ['unit']),
    ...mapGetters('switches', ['getAllSwitches', 'getHoveredSwitchIds']),
    ...mapGetters('lights', ['getLightGroups']),
    displayFloorHeight() {
      return `${this.convertToCurrentUnit(this.floorHeight)} ${this.unit}`
    },
    convertedFloorHeightPresets() {
      return this.floorHeightPresets.map(preset => ({
        value: preset.value,
        display: `${this.convertToCurrentUnit(preset.value)}`
      }))
    },
    singleSwitches() {
      return this.getAllSwitches.filter(s => s.type === 'single-switch');
    },
    doubleSwitches() {
      return this.getAllSwitches.filter(s => s.type === 'double-switch');
    },
    hoveredSwitchIds() {
      return this.getHoveredSwitchIds || [];
    },
    lightGroups() {
      // Filter out groups that are already connected to switches
      const connectedGroupIds = new Set();
      this.getAllSwitches.forEach(switchObj => {
        if (switchObj.type === 'single-switch' && switchObj.connectedGroup) {
          connectedGroupIds.add(switchObj.connectedGroup.id);
        } else if (switchObj.type === 'double-switch') {
          if (switchObj.connectedGroup1) connectedGroupIds.add(switchObj.connectedGroup1.id);
          if (switchObj.connectedGroup2) connectedGroupIds.add(switchObj.connectedGroup2.id);
        }
      });
      
      return this.getLightGroups.filter(group => !connectedGroupIds.has(group.id));
    }
  },
  methods: {
    ...mapActions('switches', ['setDefaultFloorHeight', 'connectGroupToSwitch', 'disconnectGroupFromSwitch']),
    convertToCurrentUnit(valueMM) {
      switch (this.unit) {
        case 'cm':
          return (valueMM / 10).toFixed(0)
        case 'm':
          return (valueMM / 1000).toFixed(2)
        default:
          return valueMM
      }
    },
    convertToMM(value) {
      const numberValue = parseFloat(value) || 0
      switch (this.unit) {
        case 'cm':
          return numberValue * 10
        case 'm':
          return numberValue * 1000
        default:
          return numberValue
      }
    },
    increaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight
      const newValue = this.floorHeight + this.convertToMM(step)
      this.setDefaultFloorHeight(newValue)
      this.$emit('update:floor-height', newValue)
    },
    decreaseFloorHeight() {
      const step = this.stepMap[this.unit].floorHeight
      const newValue = Math.max(0, this.floorHeight - this.convertToMM(step))
      this.setDefaultFloorHeight(newValue)
      this.$emit('update:floor-height', newValue)
    },
    handleFloorHeightBlur(e) {
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(0, this.convertToMM(value))
      this.setDefaultFloorHeight(mmValue)
      this.$emit('update:floor-height', mmValue)
      e.target.innerText = this.displayFloorHeight
    },
    handleEnter(e) {
      e.target.blur()
    },
    isFloorHeightPresetActive(value) {
      return this.floorHeight === value
    },
    setFloorHeight(value) {
      this.setDefaultFloorHeight(value)
      this.$emit('update:floor-height', value)
    },
    formatHeight(height) {
      switch (this.unit) {
        case 'cm':
          return `${(height / 10).toFixed(0)}`;
        case 'm':
          return `${(height / 1000).toFixed(2)}`;
        default: // mm
          return `${height}`;
      }
    },
    handleSwitchHover(switchObj, isEntering) {
      this.isHoveringSwitch = isEntering ? switchObj.id : null;
      
      if (isEntering) {
        // Set the switch as hovered
        this.$store.commit('switches/setHoveredSwitch', switchObj.id);
        
        // Collect all light IDs from connected groups
        const lightIds = [];
        
        if (switchObj.type === 'single-switch' && switchObj.connectedGroup) {
          lightIds.push(...switchObj.connectedGroup.lightRefs.map(ref => ref.id));
        } else if (switchObj.type === 'double-switch') {
          if (switchObj.connectedGroup1) {
            lightIds.push(...switchObj.connectedGroup1.lightRefs.map(ref => ref.id));
          }
          if (switchObj.connectedGroup2) {
            lightIds.push(...switchObj.connectedGroup2.lightRefs.map(ref => ref.id));
          }
        }
        
        // Highlight all connected lights
        if (lightIds.length > 0) {
          this.$store.commit('lights/setHoveredLight', lightIds);
        }
      } else {
        // Clear hover states unless a connection is being hovered
        if (!this.isHoveringConnection) {
          this.$store.commit('switches/setHoveredSwitch', null);
          this.$store.commit('lights/setHoveredLight', null);
        }
      }
      this.$emit('hover-change');
    },
    handleGroupHover(group, isEntering) {
      if (isEntering) {
        const lightIds = group.lightRefs.map(ref => ref.id);
        this.$store.commit('lights/setHoveredLight', lightIds);
      } else {
        this.$store.commit('lights/setHoveredLight', null);
      }
      this.$emit('hover-change');
    },
    getGroupLightCount(group) {
      return group.lightRefs ? group.lightRefs.length : 0;
    },
    handleDragStart(group) {
      this.draggedGroup = group;
      // Add data to the drag event
      event.dataTransfer.setData('text/plain', group.id);
      event.dataTransfer.effectAllowed = 'move';
    },
    handleDragEnd() {
      this.draggedGroup = null;
      this.draggedOverSwitch = null;
      this.draggedOverConnection = null;
    },
    handleDragOver(switchId, connectionNumber) {
      this.draggedOverSwitch = switchId;
      this.draggedOverConnection = connectionNumber;
    },
    handleDragLeave(switchId, connectionNumber) {
      if (this.draggedOverSwitch === switchId && this.draggedOverConnection === connectionNumber) {
        this.draggedOverSwitch = null;
        this.draggedOverConnection = null;
      }
    },
    isDraggedOver(switchId, connectionNumber) {
      return this.draggedOverSwitch === switchId && this.draggedOverConnection === connectionNumber;
    },
    async handleDrop(switchId, connectionNumber, event) {
      event.preventDefault();
      const groupId = event.dataTransfer.getData('text/plain');
      const group = this.getLightGroups.find(g => g.id === groupId);
      
      if (!group) return;

      try {
        await this.connectGroupToSwitch({
          switchId,
          connectionNumber,
          groupId: group.id,
          groupData: {
            id: group.id,
            name: group.name,
            lightRefs: group.lightRefs
          }
        });
      } catch (error) {
        console.error('Failed to connect group to switch:', error);
      }

      this.draggedGroup = null;
      this.draggedOverSwitch = null;
      this.draggedOverConnection = null;
    },
    handleConnectionClick(switchId, connectionNumber) {
      const switchObj = this.getAllSwitches.find(s => s.id === switchId);
      if (!switchObj) return;

      let group = null;
      if (switchObj.type === 'single-switch') {
        group = switchObj.connectedGroup;
      } else if (switchObj.type === 'double-switch') {
        group = connectionNumber === 1 ? switchObj.connectedGroup1 : switchObj.connectedGroup2;
      }

      if (group) {
        this.disconnectGroupFromSwitch({ switchId, connectionNumber });
      }
    },
    handleConnectionHover(group, isEntering) {
      if (!group) return;
      
      // Stop event propagation to prevent switch hover from interfering
      event.stopPropagation();
      
      this.isHoveringConnection = isEntering;
      
      if (isEntering) {
        // Highlight only the lights in this specific group
        const lightIds = group.lightRefs.map(ref => ref.id);
        this.$store.commit('lights/setHoveredLight', lightIds);
      } else {
        // Clear light highlights unless the switch is being hovered
        if (!this.isHoveringSwitch) {
          this.$store.commit('lights/setHoveredLight', null);
        } else {
          // Reapply switch hover highlights
          const switchObj = this.getAllSwitches.find(s => s.id === this.isHoveringSwitch);
          if (switchObj) {
            this.handleSwitchHover(switchObj, true);
          }
        }
      }
      this.$emit('hover-change');
    },
    getLightLabel(light) {
      if (light.type === 'ceiling') {
        return `Стельовий світильник ${light.id}`;
      } else {
        return `Настінний світильник ${light.id}`;
      }
    }
  }
}
</script>

<style scoped>

.header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.settings-section {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.preset-grid {
  margin-bottom: 12px;
  flex-shrink: 0;
}

hr {
  margin: 12px 0;
  flex-shrink: 0;
}

.switch-list {
  flex: 1;
  overflow-y: auto;
  margin: 8px 0;
  min-height: 0;
}

.group-header {
  font-size: 12px;
  color: #666;
  margin: 8px 0 4px;
  padding: 0 4px;
}

.switch-item {
  display: flex;
  align-items: flex-start;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.switch-item:hover, .switch-item.highlighted {
  background-color: #f0f0f0;
}

.switch-item.hover-active {
  background-color: #e3f2fd;
}

.switch-icon {
  font-size: 16px;
  margin-right: 8px;
  color: #666;
  transition: all 0.2s ease;
  padding-top: 2px;
}

.switch-item:hover .switch-icon,
.switch-item.highlighted .switch-icon {
  color: #333;
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
  transform: scale(1.1);
}

.switch-info {
  font-size: 12px;
  color: #333;
  transition: color 0.2s ease;
  flex: 1;
  min-width: 0;
  width: 100%;
}

.switch-item:hover .switch-info,
.switch-item.highlighted .switch-info {
  color: #000;
  font-weight: 500;
}

.height-info {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}

.connection-field {
  margin-top: 4px;
  overflow: hidden;
  width: 100%;
}

.empty-connection {
  background: #f5f5f5;
  border: 1px dashed #ccc;
  border-radius: 4px;
  padding: 3px 4px;
  margin: 2px 0;
  font-size: 10px;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.empty-connection.drop-target {
  background: #e3f2fd;
  border: 1px dashed #2196f3;
  box-shadow: 0 0 0 1px #2196f3;
}

.empty-connection.connected {
  background: #e3f2fd;
  border: 1px solid #2196f3;
}

.empty-connection.connected:hover {
  background: #bbdefb;
}

.empty-connection.connected.hover-active {
  background: #90caf9;
  border-color: #1976d2;
}

.empty-connection.connected:hover.delete-hover {
  background: #ffebee;
  border-color: #f44336;
}

.empty-connection.connected:hover.delete-hover .connected-text {
  color: #f44336;
}

.empty-connection.connected:hover.delete-hover::after {
  content: '×';
  color: #f44336;
  margin-left: 4px;
  font-weight: bold;
}

.connected-text {
  color: #2196f3;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.connection-label {
  color: #666;
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 10px;
}

.empty-text {
  color: #999;
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  font-size: 10px;
}

.light-groups {
  margin: 8px 0;
  overflow-y: auto;
  flex-shrink: 0;
  max-height: 30%;
}

.group-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s ease;
  background: #f5f5f5;
  margin: 2px 0;
}

.group-item:hover {
  background: #e8e8e8;
}

.group-item:active {
  cursor: grabbing;
}

.group-name {
  font-size: 12px;
  color: #333;
}

.group-stats {
  font-size: 10px;
  color: #666;
}

.light-count {
  background: #ddd;
  padding: 2px 6px;
  border-radius: 10px;
}

.empty-groups {
  font-size: 11px;
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
