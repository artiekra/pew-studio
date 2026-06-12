-- Set how large the level will be.
local width = 500fx
local height = 500fx
pewpew.set_level_size(width, height)

-- Create an entity at position (0,0) that will hold the background mesh.
local background = pewpew.new_customizable_entity(0fx, 0fx)
pewpew.customizable_entity_set_mesh(background, "/dynamic/background.mesh.lua", 0)

-- Configure the player
pewpew.configure_player(0, { shield = 2 })
local ship_id = pewpew.new_player_ship(width / 2fx, height / 2fx, 0)
pewpew.configure_player_ship_weapon(ship_id,
  { frequency = pewpew.CannonFrequency.FREQ_6, cannon = pewpew.CannonType.DOUBLE })

local time = 0
-- A function that will get called every game tick, which is 30 times per seconds.
function level_tick()
  time = time + 1
  pewpew.increase_score_of_player(0, 1)

  -- Stop the game if the player is dead.
  local conf = pewpew.get_player_configuration(0)
  if conf["has_lost"] == true then
    pewpew.stop_game()
  end

  -- Every 30 ticks, create a new enemy.
  if time % 30 == 0 then
    local x = fmath.random_fixedpoint(0fx, width)
    local y = fmath.random_fixedpoint(0fx, height)

    local choice = fmath.random_int(0, 100)

    if choice < 40 then
      -- Create a new BAF
      local angle = fmath.from_fraction(-1, 4) * fmath.tau()
      local baf_speed = fmath.random_fixedpoint(5fx, 10fx)
      pewpew.new_baf(x, y, angle, baf_speed, -1)
    elseif choice < 65 then
      -- Create a red Mothership
      local angle = fmath.random_fixedpoint(0fx, fmath.tau())
      pewpew.new_mothership(x, y, pewpew.MothershipType.FOUR_CORNERS, angle)
    elseif choice < 90 then
      -- Create a green Mothership
      local angle = fmath.random_fixedpoint(0fx, fmath.tau())
      pewpew.new_mothership(x, y, pewpew.MothershipType.SIX_CORNERS, angle)
    end
  end
end

-- Register the `level_tick` function to be called at every game tick.
pewpew.add_update_callback(level_tick)

