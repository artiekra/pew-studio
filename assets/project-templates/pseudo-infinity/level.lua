local width = 3000fx
local height = 3000fx
pewpew.set_level_size(width, height)

local ship_id = pewpew.new_player_ship(width / 2, height / 2, 0)
pewpew.configure_player(0, { shield = 3 })
pewpew.configure_player_ship_weapon(ship_id,
  { frequency = pewpew.CannonFrequency.FREQ_10, cannon = pewpew.CannonType.DOUBLE })

function loop_entities()
  local entities = pewpew.get_all_entities()

  for num = 1, #entities do
    local ex, ey = pewpew.entity_get_position(entities[num])

    if fmath.to_int(ex) < fmath.to_int(px) - 600 then
      ex = px + 600fx
    elseif fmath.to_int(ex) > fmath.to_int(px) + 600 then
      ex = px - 600fx
    end

    if fmath.to_int(ey) < fmath.to_int(py) - 400 then
      ey = py + 400fx
    elseif fmath.to_int(ey) > fmath.to_int(py) + 400 then
      ey = py - 400fx
    end

    pewpew.entity_set_position(entities[num], ex, ey)
  end
end

function loop_player()
  pewpew.entity_get_position(ship_id)
  local changes = 0

  if fmath.to_int(px) < (fmath.to_int(width) / 2) - 600 then
    px = (width / 2fx) + 600fx
    changes = changes + 1
  elseif fmath.to_int(px) > fmath.to_int((width / 2fx) + 600fx) then
    px = (width / 2fx) - 600fx
    changes = changes + 1
  end

  if fmath.to_int(py) < (fmath.to_int(height) / 2) - 400 then
    py = (height / 2fx) + 400fx
    changes = changes + 1
  elseif fmath.to_int(py) > (fmath.to_int(height) / 2) + 400 then
    py = (height / 2fx) - 400fx
    changes = changes + 1
  end

  local cx, cy = pewpew.entity_get_position(ship_id)
  local dx = px - cx
  local dy = py - cy

  if changes > 0 then
    local entities = pewpew.get_all_entities()

    for j = 1, #entities do
      local ex, ey = pewpew.entity_get_position(entities[j])
      pewpew.entity_set_position(entities[j], ex + dx, ey + dy)
    end
  end
end

local time = 0
function level_tick()
  time = time + 1

  local conf = pewpew.get_player_configuration(0)
  if conf["has_lost"] == true then
    pewpew.stop_game()
  end

  px, py = pewpew.entity_get_position(ship_id)

  if time % 150 == 1 then
    pewpew.new_asteroid(fmath.random_fixedpoint(px - 600fx, px + 600fx),
      fmath.random_fixedpoint(py - 400fx, py + 400fx))
  end

  loop_player()
  loop_entities()
end

pewpew.add_update_callback(level_tick)
